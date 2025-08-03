<?php
/**
 * Plugin Name: Console Monitor Pro
 * Plugin URI: https://github.com/tu-usuario/console-monitor-pro
 * Description: Sistema avanzado de debugging con consola flotante y visor móvil
 * Version: 2.0
 * Author: Tu Nombre
 * License: GPL v2 or later
 * Text Domain: console-monitor-pro
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('CONSOLE_MONITOR_VERSION', '2.0');
define('CONSOLE_MONITOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CONSOLE_MONITOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONSOLE_MONITOR_INCLUDES_DIR', CONSOLE_MONITOR_PLUGIN_DIR . 'includes/');
define('CONSOLE_MONITOR_ASSETS_URL', CONSOLE_MONITOR_PLUGIN_URL . 'assets/');

/**
 * Clase principal del plugin
 */
class ConsoleMonitorPro {
    
    private static $instance = null;
    private $floating_menu = null;
    private $console_monitor = null;
    private $mobile_viewer = null;
    private $menu_controller = null;
    
    /**
     * Singleton pattern
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor privado para singleton
     */
    private function __construct() {
        $this->init();
    }
    
    /**
     * Inicializar el plugin
     */
    private function init() {
        // Cargar dependencias
        $this->load_dependencies();
        
        // Hooks de WordPress
        add_action('init', array($this, 'init_plugin'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        
        // Hooks de activación/desactivación
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Cargar todas las dependencias del plugin
     */
    private function load_dependencies() {
        // Cargar clases principales
        require_once CONSOLE_MONITOR_INCLUDES_DIR . 'class-floating-menu.php';
        require_once CONSOLE_MONITOR_INCLUDES_DIR . 'class-console-monitor.php';
        require_once CONSOLE_MONITOR_INCLUDES_DIR . 'class-mobile-viewer.php';
        require_once CONSOLE_MONITOR_INCLUDES_DIR . 'class-menu-controller.php';
    }
    
    /**
     * Inicializar componentes del plugin
     */
    public function init_plugin() {
        // Solo cargar para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Inicializar componentes
        $this->floating_menu = new Console_Monitor_Floating_Menu();
        $this->console_monitor = new Console_Monitor_Console();
        $this->mobile_viewer = new Console_Monitor_Mobile_Viewer();
        $this->menu_controller = new Console_Monitor_Menu_Controller();
        
        // Configurar comunicación entre componentes
        $this->setup_component_communication();
    }
    
    /**
     * Configurar comunicación entre componentes
     */
    private function setup_component_communication() {
        // El controlador del menú gestiona todos los componentes
        $this->menu_controller->set_floating_menu($this->floating_menu);
        $this->menu_controller->set_console_monitor($this->console_monitor);
        $this->menu_controller->set_mobile_viewer($this->mobile_viewer);
        
        // Inicializar controlador
        $this->menu_controller->init();
    }
    
    /**
     * Enqueue de assets CSS y JS
     */
    public function enqueue_assets() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // CSS
        wp_enqueue_style(
            'console-monitor-floating-menu',
            CONSOLE_MONITOR_ASSETS_URL . 'css/floating-menu.css',
            array(),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_style(
            'console-monitor-console',
            CONSOLE_MONITOR_ASSETS_URL . 'css/console-monitor.css',
            array(),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_style(
            'console-monitor-mobile',
            CONSOLE_MONITOR_ASSETS_URL . 'css/mobile-viewer.css',
            array(),
            CONSOLE_MONITOR_VERSION
        );
        
        // JavaScript
        wp_enqueue_script('jquery');
        
        wp_enqueue_script(
            'console-monitor-floating-menu',
            CONSOLE_MONITOR_ASSETS_URL . 'js/floating-menu.js',
            array('jquery'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        wp_enqueue_script(
            'console-monitor-console',
            CONSOLE_MONITOR_ASSETS_URL . 'js/console-monitor.js',
            array('jquery'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        wp_enqueue_script(
            'console-monitor-mobile',
            CONSOLE_MONITOR_ASSETS_URL . 'js/mobile-viewer.js',
            array('jquery'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // Localizar scripts con datos del backend
        wp_localize_script('console-monitor-floating-menu', 'consoleMonitorData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('console_monitor_nonce'),
            'plugin_url' => CONSOLE_MONITOR_PLUGIN_URL,
            'current_url' => home_url($_SERVER['REQUEST_URI'])
        ));
    }
    
    /**
     * Activar plugin
     */
    public function activate() {
        // Crear opciones por defecto
        add_option('console_monitor_settings', array(
            'floating_position' => 'bottom-right',
            'console_auto_refresh' => false,
            'mobile_device_presets' => array(
                'iPhone 12' => array('width' => 390, 'height' => 844),
                'iPad' => array('width' => 768, 'height' => 1024),
                'Samsung Galaxy' => array('width' => 360, 'height' => 640)
            )
        ));
        
        // Limpiar cache si existe
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
    }
    
    /**
     * Desactivar plugin
     */
    public function deactivate() {
        // Limpiar tareas programadas si las hay
        wp_clear_scheduled_hook('console_monitor_cleanup');
        
        // Limpiar cache
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
    }
    
    /**
     * Obtener configuración del plugin
     */
    public function get_settings() {
        return get_option('console_monitor_settings', array());
    }
    
    /**
     * Actualizar configuración del plugin
     */
    public function update_settings($new_settings) {
        $current_settings = $this->get_settings();
        $updated_settings = array_merge($current_settings, $new_settings);
        return update_option('console_monitor_settings', $updated_settings);
    }
    
    /**
     * Obtener instancia de un componente específico
     */
    public function get_component($component_name) {
        switch ($component_name) {
            case 'floating_menu':
                return $this->floating_menu;
            case 'console_monitor':
                return $this->console_monitor;
            case 'mobile_viewer':
                return $this->mobile_viewer;
            case 'menu_controller':
                return $this->menu_controller;
            default:
                return null;
        }
    }
    
    /**
     * Método para debugging interno
     */
    public function debug($message, $data = null) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Console Monitor Pro] ' . $message);
            if ($data) {
                error_log('[Console Monitor Pro Data] ' . print_r($data, true));
            }
        }
    }
}

/**
 * Función principal para acceder al plugin
 */
function console_monitor_pro() {
    return ConsoleMonitorPro::get_instance();
}

/**
 * Inicializar el plugin cuando WordPress esté listo
 */
add_action('plugins_loaded', 'console_monitor_pro');

/**
 * Hook para limpiar datos al desinstalar (solo si se define)
 */
if (defined('WP_UNINSTALL_PLUGIN')) {
    delete_option('console_monitor_settings');
}
?>