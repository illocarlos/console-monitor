<?php
/**
 * Clase para gestionar el menú flotante
 * 
 * @package ConsoleMonitorPro
 * @since 2.0
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Console_Monitor_Floating_Menu {
    
    private $is_active = false;
    private $position = 'bottom-right';
    private $menu_items = array();
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init();
    }
    
    /**
     * Inicializar el menú flotante
     */
    public function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Configurar elementos del menú
        $this->setup_menu_items();
        
        // Hooks de WordPress
        add_action('wp_footer', array($this, 'render_floating_menu'));
        add_action('admin_footer', array($this, 'render_floating_menu'));
        
        // AJAX handlers
        add_action('wp_ajax_toggle_floating_menu', array($this, 'ajax_toggle_menu'));
        add_action('wp_ajax_get_menu_state', array($this, 'ajax_get_menu_state'));
        add_action('wp_ajax_update_menu_position', array($this, 'ajax_update_position'));
    }
    
    /**
     * Configurar elementos del menú
     */
    private function setup_menu_items() {
        $this->menu_items = array(
            'console' => array(
                'id' => 'console-monitor',
                'title' => 'Console Monitor',
                'description' => 'Debug y monitoreo de errores',
                'icon' => '🐛',
                'color' => '#e74c3c',
                'action' => 'open_console'
            ),
            'mobile' => array(
                'id' => 'mobile-viewer',
                'title' => 'Mobile Viewer',
                'description' => 'Vista móvil de la página',
                'icon' => '📱',
                'color' => '#3498db',
                'action' => 'open_mobile_viewer'
            ),
            'settings' => array(
                'id' => 'menu-settings',
                'title' => 'Configuración',
                'description' => 'Ajustes del menú',
                'icon' => '⚙️',
                'color' => '#95a5a6',
                'action' => 'open_settings'
            )
        );
        
        // Filtro para que otros plugins puedan añadir elementos
        $this->menu_items = apply_filters('console_monitor_menu_items', $this->menu_items);
    }
    
    /**
     * Renderizar el menú flotante en el frontend
     */
    public function render_floating_menu() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $settings = get_option('console_monitor_settings', array());
        $this->position = isset($settings['floating_position']) ? $settings['floating_position'] : 'bottom-right';
        ?>
        
        <!-- Botón flotante principal -->
        <div id="cm-floating-button" class="cm-floating-btn cm-position-<?php echo esc_attr($this->position); ?>">
            <div class="cm-btn-icon">
                <span class="cm-icon-closed">🔧</span>
                <span class="cm-icon-opened">✕</span>
            </div>
            <div class="cm-btn-pulse"></div>
        </div>
        
        <!-- Menú desplegable -->
        <div id="cm-floating-menu" class="cm-floating-menu cm-position-<?php echo esc_attr($this->position); ?>">
            <div class="cm-menu-container">
                <div class="cm-menu-header">
                    <h3>Console Monitor Pro</h3>
                    <span class="cm-version">v<?php echo CONSOLE_MONITOR_VERSION; ?></span>
                </div>
                
                <div class="cm-menu-items">
                    <?php foreach ($this->menu_items as $key => $item): ?>
                    <div class="cm-menu-item" 
                         data-action="<?php echo esc_attr($item['action']); ?>"
                         data-item-id="<?php echo esc_attr($item['id']); ?>">
                        <div class="cm-item-icon" style="color: <?php echo esc_attr($item['color']); ?>">
                            <?php echo $item['icon']; ?>
                        </div>
                        <div class="cm-item-content">
                            <div class="cm-item-title"><?php echo esc_html($item['title']); ?></div>
                            <div class="cm-item-description"><?php echo esc_html($item['description']); ?></div>
                        </div>
                        <div class="cm-item-arrow">→</div>
                    </div>
                    <?php endforeach; ?>
                </div>
                
                <div class="cm-menu-footer">
                    <div class="cm-quick-actions">
                        <button class="cm-quick-btn" data-action="minimize_all" title="Minimizar todo">
                            <span>📦</span>
                        </button>
                        <button class="cm-quick-btn" data-action="refresh_tools" title="Refrescar herramientas">
                            <span>🔄</span>
                        </button>
                        <button class="cm-quick-btn" data-action="toggle_position" title="Cambiar posición">
                            <span>📍</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Indicador de estado -->
            <div class="cm-status-indicator">
                <div class="cm-status-dot cm-status-active" title="Herramientas activas"></div>
            </div>
        </div>
        
        <!-- Overlay para cerrar el menú -->
        <div id="cm-menu-overlay" class="cm-menu-overlay"></div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Inicializar menú flotante
            ConsoleMonitorFloatingMenu.init({
                position: '<?php echo esc_js($this->position); ?>',
                menuItems: <?php echo json_encode($this->menu_items); ?>,
                ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
                nonce: '<?php echo wp_create_nonce('console_monitor_nonce'); ?>'
            });
        });
        </script>
        
        <?php
    }
    
    /**
     * AJAX: Toggle del estado del menú
     */
    public function ajax_toggle_menu() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $this->is_active = !$this->is_active;
        
        wp_send_json_success(array(
            'is_active' => $this->is_active,
            'message' => $this->is_active ? 'Menú abierto' : 'Menú cerrado'
        ));
    }
    
    /**
     * AJAX: Obtener estado actual del menú
     */
    public function ajax_get_menu_state() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $settings = get_option('console_monitor_settings', array());
        
        wp_send_json_success(array(
            'is_active' => $this->is_active,
            'position' => $this->position,
            'menu_items' => $this->menu_items,
            'settings' => $settings
        ));
    }
    
    /**
     * AJAX: Actualizar posición del menú
     */
    public function ajax_update_position() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $new_position = sanitize_text_field($_POST['position']);
        $valid_positions = array('top-left', 'top-right', 'bottom-left', 'bottom-right');
        
        if (!in_array($new_position, $valid_positions)) {
            wp_send_json_error('Posición inválida');
        }
        
        $settings = get_option('console_monitor_settings', array());
        $settings['floating_position'] = $new_position;
        update_option('console_monitor_settings', $settings);
        
        $this->position = $new_position;
        
        wp_send_json_success(array(
            'position' => $new_position,
            'message' => 'Posición actualizada'
        ));
    }
    
    /**
     * Obtener elementos del menú
     */
    public function get_menu_items() {
        return $this->menu_items;
    }
    
    /**
     * Añadir elemento al menú
     */
    public function add_menu_item($key, $item) {
        $this->menu_items[$key] = $item;
    }
    
    /**
     * Remover elemento del menú
     */
    public function remove_menu_item($key) {
        if (isset($this->menu_items[$key])) {
            unset($this->menu_items[$key]);
        }
    }
    
    /**
     * Verificar si el menú está activo
     */
    public function is_active() {
        return $this->is_active;
    }
    
    /**
     * Establecer estado del menú
     */
    public function set_active($active) {
        $this->is_active = (bool) $active;
    }
    
    /**
     * Obtener posición actual
     */
    public function get_position() {
        return $this->position;
    }
    
    /**
     * Establecer posición
     */
    public function set_position($position) {
        $valid_positions = array('top-left', 'top-right', 'bottom-left', 'bottom-right');
        if (in_array($position, $valid_positions)) {
            $this->position = $position;
        }
    }
    
    /**
     * Generar CSS dinámico basado en configuración
     */
    public function get_dynamic_css() {
        $css = '';
        
        // CSS basado en posición
        switch ($this->position) {
            case 'top-left':
                $css .= '.cm-position-top-left { top: 20px; left: 20px; }';
                break;
            case 'top-right':
                $css .= '.cm-position-top-right { top: 20px; right: 20px; }';
                break;
            case 'bottom-left':
                $css .= '.cm-position-bottom-left { bottom: 20px; left: 20px; }';
                break;
            case 'bottom-right':
            default:
                $css .= '.cm-position-bottom-right { bottom: 20px; right: 20px; }';
                break;
        }
        
        return $css;
    }
}
?>