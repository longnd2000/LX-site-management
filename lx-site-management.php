<?php
/**
 * Plugin Name: LX Site Management
 * Description: Kết nối API và đồng bộ bài viết tự động với hệ thống Next.js trung tâm mà không cần trang cấu hình.
 * Version: 1.1.0
 * Author: Longpv
 * Author URI: https://github.com/longnd2000
 * License: GPL2
 */

// Ngăn chặn truy cập trực tiếp
if (!defined('ABSPATH')) {
    exit;
}

class LX_Site_Management_Plugin {

    private static $instance = null;
    private $option_api_key_name = 'lx_site_api_key';
    private $option_webhook_url_name = 'lx_site_webhook_url';

    public static function get_instance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Tự động sinh API Key ngẫu nhiên khi kích hoạt plugin (phục vụ fallback)
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));

        // Đăng ký các REST API routes
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Hook gửi Webhook khi đăng bài hoặc cập nhật bài viết
        add_action('transition_post_status', array($this, 'handle_post_status_transition'), 10, 3);

        // Bypass bộ lọc chặn REST API ẩn danh đối với endpoint authorize
        add_filter('rest_authentication_errors', array($this, 'bypass_auth_for_authorize_endpoint'), 99);

        // Đăng ký AJAX endpoint cho việc bắt tay xác thực (bypass các plugin bảo mật chặn REST API)
        add_action('wp_ajax_nopriv_lx_authorize', array($this, 'ajax_authorize'));
        add_action('wp_ajax_lx_authorize', array($this, 'ajax_authorize'));

        // Đăng ký AJAX endpoint cho việc lấy bài viết (Bypass bảo mật REST API)
        add_action('wp_ajax_nopriv_lx_get_posts', array($this, 'ajax_get_posts'));
        add_action('wp_ajax_lx_get_posts', array($this, 'ajax_get_posts'));

        // Đăng ký AJAX endpoint sinh Login Token dùng 1 lần phục vụ SSO (Next.js backend gọi sang)
        add_action('wp_ajax_nopriv_lx_generate_login_token', array($this, 'ajax_generate_login_token'));
        add_action('wp_ajax_lx_generate_login_token', array($this, 'ajax_generate_login_token'));

        // Đăng ký AJAX endpoint đăng nhập nhanh tự động (Trình duyệt người dùng redirect tới)
        add_action('wp_ajax_nopriv_lx_quick_login', array($this, 'ajax_quick_login'));
        add_action('wp_ajax_lx_quick_login', array($this, 'ajax_quick_login'));

        // Lắng nghe luồng SSO qua trang chủ (bypass hoàn toàn mọi cơ chế chặn admin-ajax.php / wp-admin)
        add_action('init', array($this, 'handle_home_sso'));
    }

    /**
     * Tự động tạo API Key ngẫu nhiên khi kích hoạt plugin
     */
    public function activate_plugin() {
        if (!get_option($this->option_api_key_name)) {
            $random_key = bin2hex(random_bytes(32));
            update_option($this->option_api_key_name, $random_key);
        }
    }

    /**
     * Bypass bộ lọc chặn REST API đối với endpoint authorize của chúng ta
     */
    public function bypass_auth_for_authorize_endpoint($result) {
        if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/lx-site-management/v1/authorize') !== false) {
            return null; // Trả về null để bypass chặn REST API
        }
        return $result;
    }

    /**
     * Đăng ký REST routes cho Next.js gọi vào
     */
    public function register_rest_routes() {
        // Endpoint 1: Xác thực tài khoản Admin WordPress và trao đổi lấy API Key
        register_rest_route('lx-site-management/v1', '/authorize', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array($this, 'api_authorize'),
            'permission_callback' => '__return_true', // Xác thực bên trong callback
        ));

        // Endpoint 2: Kiểm tra trạng thái hoạt động của API Key hiện tại
        register_rest_route('lx-site-management/v1', '/verify', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array($this, 'api_verify_connection'),
            'permission_callback' => array($this, 'validate_api_key'),
        ));

        // Endpoint 3: Lấy bài viết vệ tinh (cho luồng Pull)
        register_rest_route('lx-site-management/v1', '/posts', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array($this, 'api_get_posts'),
            'permission_callback' => array($this, 'validate_api_key'),
        ));
    }

    /**
     * API Callback: Đăng nhập admin WP và trả về API Key cùng cấu hình Webhook
     */
    public function api_authorize(WP_REST_Request $request) {
        $username = '';
        $password = '';

        // Cách 1: Đọc từ Header Authorization Basic
        $auth_header = $request->get_header('Authorization');
        if (!empty($auth_header) && strpos($auth_header, 'Basic ') === 0) {
            $credentials = base64_decode(substr($auth_header, 6));
            $parts = explode(':', $credentials, 2);
            if (count($parts) === 2) {
                $username = $parts[0];
                $password = $parts[1];
            }
        }

        // Cách 2: Fallback đọc từ JSON Payload nếu Header bị chặn bởi server
        if (empty($username) || empty($password)) {
            $params = $request->get_json_params();
            $username = isset($params['username']) ? sanitize_text_field($params['username']) : '';
            $password = isset($params['password']) ? $params['password'] : '';
        }

        if (empty($username) || empty($password)) {
            return new WP_Error('rest_unauthorized', 'Thiếu thông tin đăng nhập tài khoản WordPress.', array('status' => 401));
        }

        // 1. Tìm user bằng username hoặc email trong cơ sở dữ liệu
        $user = get_user_by('login', $username);
        if (!$user) {
            $user = get_user_by('email', $username);
        }

        if (!$user) {
            return new WP_Error('rest_forbidden', 'Tài khoản không tồn tại trên hệ thống WordPress.', array('status' => 403));
        }

        // 2. So khớp trực tiếp mật khẩu bằng hàm core của WordPress
        if (!wp_check_password($password, $user->user_pass, $user->ID)) {
            return new WP_Error('rest_forbidden', 'Mật khẩu tài khoản WordPress không chính xác.', array('status' => 403));
        }

        // 3. Kiểm tra xem User có quyền Quản trị viên (Administrator) hoặc Biên tập viên (Editor) hay không
        $allowed_roles = array('administrator', 'editor');
        $user_roles = $user->roles;
        $has_permission = false;
        
        if (is_array($user_roles)) {
            foreach ($allowed_roles as $role) {
                if (in_array($role, $user_roles)) {
                    $has_permission = true;
                    break;
                }
            }
        }

        if (!$has_permission) {
            return new WP_Error('rest_forbidden', 'Tài khoản "' . $user->user_login . '" không phải là Biên tập viên hoặc Quản trị viên.', array('status' => 403));
        }

        // Xác thực thành công:
        // 1. Lấy hoặc tạo mới API Key
        $api_key = get_option($this->option_api_key_name);
        if (empty($api_key)) {
            $api_key = bin2hex(random_bytes(32));
            update_option($this->option_api_key_name, $api_key);
        }

        // 2. Tự động lưu Webhook URL nếu Next.js gửi sang
        $params = $request->get_json_params();
        if (isset($params['webhook_url']) && filter_var($params['webhook_url'], FILTER_VALIDATE_URL)) {
            update_option($this->option_webhook_url_name, esc_url_raw($params['webhook_url']));
        }

        // 3. Lưu User ID đã kết nối để hỗ trợ Single Sign-On (SSO)
        update_option('lx_connected_user_id', $user->ID);

        return new WP_REST_Response(array(
            'success'   => true,
            'api_key'   => $api_key,
            'site_name' => get_bloginfo('name'),
            'site_url'  => site_url(),
        ), 200);
    }

    /**
     * Kiểm tra API Key gửi lên trong header để xác thực
     */
    public function validate_api_key(WP_REST_Request $request) {
        $api_key_header = $request->get_header('X-LX-API-Key');
        $api_key_query = $request->get_param('api_key');
        
        $provided_key = $api_key_header ? $api_key_header : $api_key_query;
        $saved_key = get_option($this->option_api_key_name);

        if (empty($saved_key)) {
            return new WP_Error('rest_forbidden', 'Hệ thống chưa thiết lập API Key.', array('status' => 500));
        }

        if (hash_equals($saved_key, $provided_key)) {
            return true;
        }

        return new WP_Error('rest_forbidden', 'API Key không chính xác hoặc đã hết hạn.', array('status' => 403));
    }

    /**
     * API Callback: Xác thực trạng thái kết nối
     */
    public function api_verify_connection(WP_REST_Request $request) {
        return new WP_REST_Response(array(
            'success' => true,
            'site_name' => get_bloginfo('name'),
            'site_url'  => site_url(),
            'version'   => '1.1.0'
        ), 200);
    }

    /**
     * API Callback: Lấy danh sách bài viết
     */
    public function api_get_posts(WP_REST_Request $request) {
        $page = $request->get_param('page') ? intval($request->get_param('page')) : 1;
        $per_page = $request->get_param('per_page') ? intval($request->get_param('per_page')) : 10;
        
        $args = array(
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'orderby'        => 'date',
            'order'          => 'DESC'
        );

        $query = new WP_Query($args);
        $posts = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                global $post;
                
                $posts[] = array(
                    'wp_post_id'    => $post->ID,
                    'title'         => get_the_title(),
                    'excerpt'       => get_the_excerpt(),
                    'content'       => get_the_content(),
                    'url'           => get_permalink(),
                    'author_name'   => get_the_author_meta('display_name', $post->post_author),
                    'published_at'  => get_post_datetime($post, 'date', 'gmt') ? get_post_datetime($post, 'date', 'gmt')->format('Y-m-d H:i:s') : $post->post_date_gmt,
                    'status'        => 'publish'
                );
            }
            wp_reset_postdata();
        }

        $total_posts = $query->found_posts;
        $max_pages = $query->max_num_pages;

        $response = new WP_REST_Response(array(
            'success'      => true,
            'posts'        => $posts,
            'total_posts'  => $total_posts,
            'total_pages'  => $max_pages,
            'current_page' => $page,
            'per_page'     => $per_page
        ), 200);

        $response->header('X-WP-Total', $total_posts);
        $response->header('X-WP-TotalPages', $max_pages);

        return $response;
    }

    /**
     * Webhook Trigger: Gửi bài viết sang Next.js khi đăng bài mới
     */
    public function handle_post_status_transition($new_status, $old_status, $post) {
        if ($post->post_type !== 'post') {
            return;
        }

        $webhook_url = get_option($this->option_webhook_url_name);
        if (empty($webhook_url)) {
            return;
        }

        if ($new_status === 'publish') {
            $api_key = get_option($this->option_api_key_name);
            
            $payload = array(
                'event'         => 'post_published',
                'site_url'      => site_url(),
                'wp_post_id'    => $post->ID,
                'title'         => get_the_title($post),
                'excerpt'       => get_the_excerpt($post),
                'content'       => $post->post_content,
                'url'           => get_permalink($post),
                'author_name'   => get_the_author_meta('display_name', $post->post_author),
                'published_at'  => get_post_datetime($post, 'date', 'gmt') ? get_post_datetime($post, 'date', 'gmt')->format('Y-m-d H:i:s') : $post->post_date_gmt,
                'status'        => 'publish'
            );

            wp_remote_post($webhook_url, array(
                'method'      => 'POST',
                'timeout'     => 15,
                'redirection' => 5,
                'httpversion' => '1.0',
                'blocking'    => false,
                'headers'     => array(
                    'Content-Type'  => 'application/json',
                    'X-LX-API-Key'  => $api_key,
                ),
                'body'        => wp_json_encode($payload),
            ));
        }
    }

    /**
     * AJAX Callback: Đăng nhập và bắt tay trao đổi API Key (Bypass bảo mật REST API và các plugin chặn ẩn danh)
     * -------------------------------------------------------------------------------------------------
     * TẠI SAO PHẢI XÁC THỰC BẰNG WP_CHECK_PASSWORD THAY VÌ WP_AUTHENTICATE? (DÀNH CHO PHỎNG VẤN)
     * 1. Hàm wp_authenticate() của WordPress core chạy rất nhiều filter/action liên quan đến cookie, session,
     *    và các plugin bảo mật khác (như bảo mật 2 lớp, captcha, chặn IP, hoặc chặn REST API Basic Auth).
     *    Điều này khiến request từ ứng dụng SaaS Next.js bên ngoài thường xuyên bị chặn nhầm.
     * 
     * 2. Giải pháp trực tiếp:
     *    - Tìm User trong DB bằng get_user_by().
     *    - Dùng wp_check_password() để so khớp trực tiếp chuỗi mật khẩu thô gửi lên với mật khẩu đã hash lưu trong DB.
     *    - Giải pháp này bỏ qua toàn bộ login pipeline rườm rà, độc lập 100% với các plugin bảo mật bên thứ ba,
     *      giúp việc bắt tay 1 lần ban đầu luôn thành công nếu nhập đúng tài khoản/mật khẩu.
     */
    public function ajax_authorize() {
        // Hỗ trợ cả JSON body hoặc Form POST
        $username = isset($_POST['username']) ? sanitize_text_field($_POST['username']) : '';
        $password = isset($_POST['password']) ? $_POST['password'] : '';
        $webhook_url = isset($_POST['webhook_url']) ? esc_url_raw($_POST['webhook_url']) : '';

        // Nếu trống, thử đọc từ JSON payload
        if (empty($username) || empty($password)) {
            $json_payload = file_get_contents('php://input');
            $params = json_decode($json_payload, true);
            if (is_array($params)) {
                $username = isset($params['username']) ? sanitize_text_field($params['username']) : '';
                $password = isset($params['password']) ? $params['password'] : '';
                $webhook_url = isset($params['webhook_url']) ? esc_url_raw($params['webhook_url']) : '';
            }
        }

        if (empty($username) || empty($password)) {
            wp_send_json_error(array('message' => 'Thiếu thông tin đăng nhập tài khoản WordPress.'), 400);
        }

        // 1. Tìm user bằng username hoặc email trong cơ sở dữ liệu
        $user = get_user_by('login', $username);
        if (!$user) {
            $user = get_user_by('email', $username);
        }

        if (!$user) {
            wp_send_json_error(array('message' => 'Tài khoản không tồn tại trên hệ thống WordPress.'), 403);
        }

        // 2. So khớp trực tiếp mật khẩu bằng hàm core của WordPress
        if (!wp_check_password($password, $user->user_pass, $user->ID)) {
            wp_send_json_error(array('message' => 'Mật khẩu tài khoản WordPress không chính xác.'), 403);
        }

        // 3. Kiểm tra xem User có quyền Quản trị viên (Administrator) hoặc Biên tập viên (Editor) hay không
        $allowed_roles = array('administrator', 'editor');
        $user_roles = $user->roles;
        $has_permission = false;
        
        if (is_array($user_roles)) {
            foreach ($allowed_roles as $role) {
                if (in_array($role, $user_roles)) {
                    $has_permission = true;
                    break;
                }
            }
        }

        if (!$has_permission) {
            wp_send_json_error(array('message' => 'Tài khoản "' . $user->user_login . '" không phải là Biên tập viên hoặc Quản trị viên.'), 403);
        }

        // Xác thực thành công:
        // 1. Lấy hoặc tạo mới API Key
        $api_key = get_option($this->option_api_key_name);
        if (empty($api_key)) {
            $api_key = bin2hex(random_bytes(32));
            update_option($this->option_api_key_name, $api_key);
        }

        // 2. Tự động lưu Webhook URL nếu gửi sang
        if (!empty($webhook_url) && filter_var($webhook_url, FILTER_VALIDATE_URL)) {
            update_option($this->option_webhook_url_name, $webhook_url);
        }

        // 3. Lưu User ID đã kết nối để hỗ trợ Single Sign-On (SSO)
        update_option('lx_connected_user_id', $user->ID);

        wp_send_json_success(array(
            'success'   => true,
            'api_key'   => $api_key,
            'site_name' => get_bloginfo('name'),
            'site_url'  => site_url(),
        ), 200);
    }

    /**
     * AJAX Callback: Lấy danh sách bài viết (Bypass bảo mật REST API)
     */
    public function ajax_get_posts() {
        // 1. Xác thực API Key
        $api_key_header = isset($_SERVER['HTTP_X_LX_API_KEY']) ? $_SERVER['HTTP_X_LX_API_KEY'] : '';
        $api_key_param = isset($_REQUEST['api_key']) ? $_REQUEST['api_key'] : '';
        $provided_key = !empty($api_key_header) ? $api_key_header : $api_key_param;
        $saved_key = get_option($this->option_api_key_name);

        if (empty($saved_key)) {
            wp_send_json_error(array('message' => 'Hệ thống website vệ tinh chưa thiết lập API Key.'), 500);
        }

        if (empty($provided_key) || !hash_equals($saved_key, $provided_key)) {
            wp_send_json_error(array('message' => 'API Key không chính xác hoặc đã hết hạn.'), 403);
        }

        // 2. Lấy tham số phân trang
        $page = isset($_REQUEST['page']) ? intval($_REQUEST['page']) : 1;
        $per_page = isset($_REQUEST['per_page']) ? intval($_REQUEST['per_page']) : 10;

        $args = array(
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'orderby'        => 'date',
            'order'          => 'DESC'
        );

        $query = new WP_Query($args);
        $posts = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                global $post;
                
                $posts[] = array(
                    'wp_post_id'    => $post->ID,
                    'title'         => get_the_title(),
                    'excerpt'       => get_the_excerpt(),
                    'content'       => get_the_content(),
                    'url'           => get_permalink(),
                    'author_name'   => get_the_author_meta('display_name', $post->post_author),
                    'published_at'  => get_post_datetime($post, 'date', 'gmt') ? get_post_datetime($post, 'date', 'gmt')->format('Y-m-d H:i:s') : $post->post_date_gmt,
                    'status'        => 'publish'
                );
            }
            wp_reset_postdata();
        }

        $total_posts = $query->found_posts;
        $max_pages = $query->max_num_pages;

        wp_send_json_success(array(
            'posts'        => $posts,
            'total_posts'  => $total_posts,
            'total_pages'  => $max_pages,
            'current_page' => $page,
            'per_page'     => $per_page
        ), 200);
    }

    /**
     * AJAX Callback: Sinh mã token đăng nhập 1 lần (SSO) từ API Key
     */
    public function ajax_generate_login_token() {
        // 1. Xác thực API Key
        $api_key_header = isset($_SERVER['HTTP_X_LX_API_KEY']) ? $_SERVER['HTTP_X_LX_API_KEY'] : '';
        $api_key_param = isset($_REQUEST['api_key']) ? $_REQUEST['api_key'] : '';
        $provided_key = !empty($api_key_header) ? $api_key_header : $api_key_param;
        $saved_key = get_option($this->option_api_key_name);

        if (empty($saved_key) || empty($provided_key) || !hash_equals($saved_key, $provided_key)) {
            wp_send_json_error(array('message' => 'API Key không chính xác hoặc không được phép tạo token.'), 403);
        }

        // 2. Lấy ID user đã kết nối
        $user_id = get_option('lx_connected_user_id');
        if (empty($user_id)) {
            // Fallback lấy admin đầu tiên nếu chưa lưu
            $admins = get_users(array('role' => 'administrator', 'number' => 1));
            if (!empty($admins)) {
                $user_id = $admins[0]->ID;
            } else {
                wp_send_json_error(array('message' => 'Không tìm thấy tài khoản quản trị để sinh token.'), 404);
            }
        }

        // 3. Sinh token ngẫu nhiên, lưu vào transient hiệu lực 60 giây
        $token = bin2hex(random_bytes(16));
        set_transient('lx_login_token_' . $token, $user_id, 60);

        wp_send_json_success(array(
            'token' => $token
        ), 200);
    }

    /**
     * AJAX Callback: Thực hiện đăng nhập nhanh tự động (SSO) và chuyển hướng
     */
    public function ajax_quick_login() {
        $token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';
        $redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '';

        if (empty($token)) {
            wp_die('Mã đăng nhập nhanh (Token) không hợp lệ hoặc thiếu.', 'Lỗi đăng nhập nhanh', array('response' => 400));
        }

        // Lấy User ID lưu trong transient tương ứng với token
        $user_id = get_transient('lx_login_token_' . $token);

        if (empty($user_id)) {
            wp_die('Mã đăng nhập nhanh đã hết hạn (60 giây) hoặc không tồn tại. Vui lòng bấm thử lại từ Dashboard Central.', 'Token hết hạn', array('response' => 403));
        }

        // Xóa token dùng 1 lần ngay lập tức để bảo mật
        delete_transient('lx_login_token_' . $token);

        // Thực hiện tự động đăng nhập (SSO) thiết lập cookie cho trình duyệt
        wp_clear_auth_cookie();
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true);

        // Chuyển hướng tới link mong muốn an toàn (Ngăn chặn lỗ hổng Open Redirect)
        $redirect_url = admin_url('index.php');
        if (!empty($redirect)) {
            $redirect = sanitize_text_field($redirect);
            if (strpos($redirect, 'http://') === 0 || strpos($redirect, 'https://') === 0) {
                // Nếu truyền URL tuyệt đối, kiểm tra xem có thuộc host tin cậy của site không
                $redirect_url = wp_validate_redirect($redirect, admin_url('index.php'));
            } else {
                // Nếu là relative path, nối trực tiếp với admin_url
                $redirect_url = admin_url($redirect);
            }
        }

        wp_safe_redirect($redirect_url);
        exit;
    }

    /**
     * Lắng nghe và xử lý tự động đăng nhập SSO thông qua Trang chủ (Public Home Page)
     * -----------------------------------------------------------------------------
     * TẠI SAO PHẢI SSO QUA TRANG CHỦ? (DÀNH CHO PHỎNG VẤN)
     * - admin-ajax.php và wp-login.php là các khu vực nhạy cảm hay bị bot tấn công spam,
     *   nên các plugin bảo mật (WP Cerber, Wordfence) chặn truy cập rất nghiêm ngặt đối với khách chưa login.
     * - Trang chủ index.php là trang public của mọi website, không bao giờ bị chặn.
     * - Bằng cách lắng nghe tham số ?lx_sso=1&token=xxx ở trang chủ, ta đăng nhập cookie trực tiếp cho user 
     *   và dùng wp_redirect chuyển hướng thẳng vào admin edit bài viết, bypass 100% các lớp chặn bảo mật.
     */
    public function handle_home_sso() {
        if (isset($_GET['lx_sso']) && $_GET['lx_sso'] === '1') {
            $token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';
            $redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '';

            // TỐI ƯU TRẢI NGHIỆM: Nếu trình duyệt đã đăng nhập sẵn rồi, redirect thẳng luôn, không cần SSO lại
            if (is_user_logged_in()) {
                $redirect_url = admin_url('index.php');
                if (!empty($redirect)) {
                    if (strpos($redirect, 'http') === 0) {
                        $redirect_url = esc_url_raw($redirect);
                    } else {
                        $redirect_url = admin_url($redirect);
                    }
                }
                wp_redirect($redirect_url);
                exit;
            }

            if (empty($token)) {
                wp_die('Mã đăng nhập nhanh (Token) không hợp lệ hoặc thiếu.', 'Lỗi đăng nhập nhanh', array('response' => 400));
            }

            // Lấy User ID lưu trong transient tương ứng với token
            $user_id = get_transient('lx_login_token_' . $token);

            if (empty($user_id)) {
                wp_die('Mã đăng nhập nhanh đã hết hạn (60 giây) hoặc không tồn tại. Vui lòng bấm thử lại từ Dashboard Central.', 'Token hết hạn', array('response' => 403));
            }

            // Xóa token dùng 1 lần ngay lập tức để bảo mật
            delete_transient('lx_login_token_' . $token);

            // Thực hiện tự động đăng nhập (SSO) thiết lập cookie cho trình duyệt
            wp_clear_auth_cookie();
            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id, true);

            // Chuyển hướng tới link mong muốn trong admin an toàn (Chống Open Redirect)
            $redirect_url = admin_url('index.php');
            if (!empty($redirect)) {
                $redirect = sanitize_text_field($redirect);
                if (strpos($redirect, 'http://') === 0 || strpos($redirect, 'https://') === 0) {
                    // Nếu truyền URL tuyệt đối, kiểm tra xem có thuộc host tin cậy của site không
                    $redirect_url = wp_validate_redirect($redirect, admin_url('index.php'));
                } else {
                    // Nếu là relative path, nối trực tiếp với admin_url
                    $redirect_url = admin_url($redirect);
                }
            }

            wp_safe_redirect($redirect_url);
            exit;
        }
    }
}

// Khởi chạy plugin
LX_Site_Management_Plugin::get_instance();
