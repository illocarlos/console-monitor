/**
 * Console Monitor Pro - JavaScript Simplificado
 * Solo Terminal y iPhone/Tablet, nada más
 * MEJORADO: Debouncing, RAF, Cache de logs + SISTEMA DE FILTROS
 */

(function ($) {
    'use strict';

    // Estado global simple
    window.ConsoleMonitor = {

        // Estado
        state: {
            isExpanded: false,
            activePanel: null, // 'terminal' | 'iphone' | null
            isTransforming: false,
            terminalLogs: [],
            iphoneOrientation: 'portrait',
            currentDevice: 'iphone-15-pro',

            // NUEVO: Sistema de filtros AMPLIADO
            activeFilter: 'all',
            errorCategories: {
                'all': {
                    label: 'Todos',
                    icon: '📋',
                    count: 0,
                    color: '#667eea'
                },
                'console': {
                    label: 'Console',
                    icon: '💬',
                    count: 0,
                    color: '#3498db',
                    keywords: ['console.log', 'console.info']
                },
                'php': {
                    label: 'PHP',
                    icon: '🐘',
                    count: 0,
                    color: '#8e44ad',
                    keywords: ['php', 'fatal error', 'parse error', 'warning:', 'notice:', '.php']
                },
                // NUEVOS: 4 FILTROS CRÍTICOS
                'database': {
                    label: 'Database',
                    icon: '🗄️',
                    count: 0,
                    color: '#d32f2f',
                    keywords: ['mysql', 'database', 'connection', 'sql', 'wpdb', 'duplicate entry', 'table doesn\'t exist', 'db_connect_error', 'query']
                },
                'plugins': {
                    label: 'Plugins',
                    icon: '🔌',
                    count: 0,
                    color: '#7b1fa2',
                    keywords: ['plugin', 'wp-content/plugins', 'activation', 'deactivation', 'conflict', 'plugin_', 'activate_plugin']
                },
                'resources': {
                    label: 'Resources',
                    icon: '📦',
                    count: 0,
                    color: '#ff6f00',
                    keywords: ['404', 'failed to load', 'net::', 'timeout', 'resource', 'not found', 'loading', 'cdn', 'asset']
                },
                'theme': {
                    label: 'Theme',
                    icon: '🎨',
                    count: 0,
                    color: '#388e3c',
                    keywords: ['wp-content/themes', 'template', 'stylesheet', 'theme', 'get_template', 'template_redirect']
                },
                // FILTROS ORIGINALES
                'cors': {
                    label: 'CORS',
                    icon: '🚫',
                    count: 0,
                    color: '#e74c3c',
                    keywords: ['cors', 'cross-origin', 'access-control', 'blocked by cors']
                },
                'ajax': {
                    label: 'AJAX',
                    icon: '🌐',
                    count: 0,
                    color: '#f39c12',
                    keywords: ['xmlhttprequest', 'fetch', 'ajax', 'admin-ajax.php', 'wp-admin/admin-ajax.php']
                },
                'js': {
                    label: 'JavaScript',
                    icon: '⚡',
                    count: 0,
                    color: '#f1c40f',
                    keywords: ['uncaught', 'syntaxerror', 'referenceerror', 'typeerror', 'undefined is not']
                },
                'deprecation': {
                    label: 'Deprecated',
                    icon: '⚠️',
                    count: 0,
                    color: '#ff9500',
                    keywords: ['deprecated', 'function is deprecated', 'wp_', 'legacy']
                },
                'fatal': {
                    label: 'Fatal',
                    icon: '💀',
                    count: 0,
                    color: '#c0392b',
                    keywords: ['fatal error', 'maximum execution', 'out of memory', 'call to undefined']
                },
                'security': {
                    label: 'Security',
                    icon: '🔒',
                    count: 0,
                    color: '#8b0000',
                    keywords: ['nonce', 'unauthorized', 'permission', 'security', 'csrf']
                }
            },

            deviceSpecs: {
                // iPhones
                'iphone-15-pro-max': { width: 430, height: 932, name: 'iPhone 15 Pro Max', type: 'phone' },
                'iphone-15-pro': { width: 393, height: 852, name: 'iPhone 15 Pro', type: 'phone' },
                'iphone-15': { width: 393, height: 852, name: 'iPhone 15', type: 'phone' },
                'iphone-14-pro-max': { width: 430, height: 932, name: 'iPhone 14 Pro Max', type: 'phone' },
                'iphone-14-pro': { width: 393, height: 852, name: 'iPhone 14 Pro', type: 'phone' },
                'iphone-14': { width: 390, height: 844, name: 'iPhone 14', type: 'phone' },
                'iphone-13-pro-max': { width: 428, height: 926, name: 'iPhone 13 Pro Max', type: 'phone' },
                'iphone-13-pro': { width: 390, height: 844, name: 'iPhone 13 Pro', type: 'phone' },
                'iphone-13': { width: 390, height: 844, name: 'iPhone 13', type: 'phone' },
                'iphone-12-pro-max': { width: 428, height: 926, name: 'iPhone 12 Pro Max', type: 'phone' },
                'iphone-12-pro': { width: 390, height: 844, name: 'iPhone 12 Pro', type: 'phone' },
                'iphone-se': { width: 375, height: 667, name: 'iPhone SE', type: 'phone' },

                // iPads
                'ipad-pro-12-9': { width: 1024, height: 1366, name: 'iPad Pro 12.9"', type: 'tablet' },
                'ipad-pro-11': { width: 834, height: 1194, name: 'iPad Pro 11"', type: 'tablet' },
                'ipad-air': { width: 820, height: 1180, name: 'iPad Air', type: 'tablet' },
                'ipad-10-9': { width: 810, height: 1080, name: 'iPad 10.9"', type: 'tablet' },
                'ipad-mini': { width: 744, height: 1133, name: 'iPad Mini', type: 'tablet' },
                'ipad-9-7': { width: 768, height: 1024, name: 'iPad 9.7"', type: 'tablet' },

                // Android Tablets
                'galaxy-tab-s9-ultra': { width: 1848, height: 2960, name: 'Galaxy Tab S9 Ultra', type: 'tablet' },
                'galaxy-tab-s9-plus': { width: 1752, height: 2800, name: 'Galaxy Tab S9+', type: 'tablet' },
                'galaxy-tab-s9': { width: 1640, height: 2536, name: 'Galaxy Tab S9', type: 'tablet' },
                'galaxy-tab-a9-plus': { width: 1344, height: 2000, name: 'Galaxy Tab A9+', type: 'tablet' },
                'surface-pro-9': { width: 1440, height: 2160, name: 'Surface Pro 9', type: 'tablet' },
                'pixel-tablet': { width: 1600, height: 2560, name: 'Pixel Tablet', type: 'tablet' }
            }
        },

        // Elementos DOM
        elements: {
            $container: null,
            $btn: null,
            $terminal: null,
            $iphone: null,
            $overlay: null,
            $logs: null
        },

        // Estado del drag
        dragState: {
            isDragging: false,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0
        },

        // Cache de logs
        logCache: {
            renderedCount: 0,
            lastRenderTime: 0,
            fragment: null
        },

        // ========================================
        // NUEVAS FUNCIONES PARA FILTROS
        // ========================================

        // MEJORADO: Categorizar un log según su contenido
        categorizeLog: function (log) {
            const message = log.message.toLowerCase();
            const source = (log.source || '').toLowerCase();
            const type = log.type.toLowerCase();

            // Priorizar detección específica para los 4 críticos nuevos

            // 1. Database - MUY ESPECÍFICO
            if (message.includes('mysql') || message.includes('database') ||
                message.includes('wpdb') || message.includes('sql') ||
                message.includes('db_connect') || message.includes('duplicate entry') ||
                message.includes('table') && (message.includes('exist') || message.includes('found'))) {
                return 'database';
            }

            // 2. Plugins - DETECTAR POR PATH Y KEYWORDS
            if (source.includes('wp-content/plugins') ||
                message.includes('plugin') || message.includes('activate_plugin') ||
                message.includes('deactivation') || message.includes('activation')) {
                return 'plugins';
            }

            // 3. Theme - DETECTAR POR PATH Y KEYWORDS
            if (source.includes('wp-content/themes') ||
                message.includes('template') || message.includes('stylesheet') ||
                message.includes('get_template') || message.includes('theme')) {
                return 'theme';
            }

            // 4. Resources - 404s Y LOADING ERRORS
            if (message.includes('404') || message.includes('failed to load') ||
                message.includes('net::') || message.includes('timeout') ||
                message.includes('not found') || message.includes('loading') ||
                (type === 'error' && (message.includes('css') || message.includes('js') || message.includes('image')))) {
                return 'resources';
            }

            // Resto de categorías existentes con detección mejorada
            for (const [category, config] of Object.entries(this.state.errorCategories)) {
                if (category === 'all') continue;

                // Skip los 4 críticos que ya detectamos arriba
                if (['database', 'plugins', 'theme', 'resources'].includes(category)) continue;

                if (config.keywords) {
                    for (const keyword of config.keywords) {
                        if (message.includes(keyword) || source.includes(keyword)) {
                            return category;
                        }
                    }
                }
            }

            // Fallback mejorado por tipo de log
            switch (type) {
                case 'log':
                case 'info':
                    return 'console';
                case 'error':
                    // Detectar si es error de PHP por source
                    if (source.includes('.php')) {
                        return 'php';
                    }
                    // Si menciona JavaScript específicamente
                    if (message.includes('script') || message.includes('javascript')) {
                        return 'js';
                    }
                    return 'js'; // Default para errores genéricos
                case 'warn':
                case 'warning':
                    // Los warnings de PHP suelen ser deprecations
                    if (source.includes('.php') || message.includes('deprecated')) {
                        return 'deprecation';
                    }
                    return 'deprecation';
                default:
                    return 'js';
            }
        },

        // Actualizar contadores de categorías
        updateCategoryCounters: function () {
            // Reset counters
            Object.keys(this.state.errorCategories).forEach(key => {
                this.state.errorCategories[key].count = 0;
            });

            // Contar por categoría
            this.state.terminalLogs.forEach(log => {
                const category = this.categorizeLog(log);
                if (this.state.errorCategories[category]) {
                    this.state.errorCategories[category].count++;
                }
                this.state.errorCategories.all.count++;
            });

            // Actualizar UI de filtros
            this.updateFilterButtons();
        },

        // Crear HTML de botones de filtro
        renderFilterButtons: function () {
            const filtersHtml = Object.entries(this.state.errorCategories).map(([key, config]) => {
                const isActive = this.state.activeFilter === key;
                const hasLogs = config.count > 0;

                return `
                    <button class="cm-filter-btn ${isActive ? 'active' : ''} ${!hasLogs ? 'disabled' : ''}" 
                            data-filter="${key}"
                            style="--filter-color: ${config.color}"
                            title="${config.label} (${config.count})">
                        <span class="cm-filter-icon">${config.icon}</span>
                        <span class="cm-filter-label">${config.label}</span>
                        <span class="cm-filter-count">${config.count}</span>
                    </button>
                `;
            }).join('');

            return `<div class="cm-filter-bar">${filtersHtml}</div>`;
        },

        // Actualizar botones de filtro
        updateFilterButtons: function () {
            const $filterBar = $('.cm-filter-bar');
            if ($filterBar.length === 0) return;

            Object.entries(this.state.errorCategories).forEach(([key, config]) => {
                const $btn = $filterBar.find(`[data-filter="${key}"]`);
                const hasLogs = config.count > 0;

                $btn.find('.cm-filter-count').text(config.count);
                $btn.toggleClass('disabled', !hasLogs);
                $btn.toggleClass('active', this.state.activeFilter === key);
            });
        },

        // Obtener logs filtrados
        getFilteredLogs: function () {
            if (this.state.activeFilter === 'all') {
                return this.state.terminalLogs;
            }

            return this.state.terminalLogs.filter(log => {
                return this.categorizeLog(log) === this.state.activeFilter;
            });
        },

        // Cambiar filtro activo
        setActiveFilter: function (filter) {
            if (this.state.activeFilter === filter) return;

            this.state.activeFilter = filter;
            this.logCache.renderedCount = 0; // Reset cache
            this.logCache.fragment = null;
            this.updateCategoryCounters();
            this.renderLogs();

            // Guardar filtro en localStorage
            try {
                localStorage.setItem('cm_active_filter', filter);
            } catch (e) { }

            console.log(`🔍 Filter changed to: ${filter}`);
        },

        // Restaurar filtro guardado
        restoreActiveFilter: function () {
            try {
                const saved = localStorage.getItem('cm_active_filter');
                if (saved && this.state.errorCategories[saved]) {
                    this.state.activeFilter = saved;
                }
            } catch (e) { }
        },

        // ========================================
        // FUNCIONES EXISTENTES (algunas modificadas)
        // ========================================

        // Inicializar
        init: function () {
            this.cacheElements();
            this.bindEvents();
            this.setupDragging();
            this.loadInitialLogs();
            this.restoreButtonPosition();
            this.restoreActiveFilter(); // NUEVO

            // Inicializar cache de logs
            this.logCache = {
                renderedCount: 0,
                lastRenderTime: 0,
                fragment: null
            };

            console.log('✅ Console Monitor initialized');
        },

        // Cachear elementos
        cacheElements: function () {
            this.elements.$container = $('.cm-floating-container');
            this.elements.$btn = $('#cm-floating-btn');
            this.elements.$terminal = $('#cm-terminal');
            this.elements.$iphone = $('#cm-iphone');
            this.elements.$overlay = $('#cm-overlay');
            this.elements.$logs = $('#cm-logs');
        },

        // Eventos
        bindEvents: function () {
            var self = this;

            // Click en botón flotante principal (solo si no está arrastrando)
            this.elements.$btn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.dragState.isDragging) {
                    self.toggleExpanded();
                }
            });

            // Click en botones de opciones
            $(document).on('click', '.cm-option-btn.terminal', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.selectTerminal();
            });

            $(document).on('click', '.cm-option-btn.iphone', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.selectIphone();
            });

            // NUEVO: Click en botones de filtro
            $(document).on('click', '.cm-filter-btn', function (e) {
                e.preventDefault();
                const filter = $(this).data('filter');
                const hasLogs = !$(this).hasClass('disabled');

                if (hasLogs) {
                    self.setActiveFilter(filter);
                }
            });

            // Cerrar paneles
            $('.cm-btn-close').on('click', function (e) {
                e.preventDefault();
                self.closeActivePanel();
            });

            // Limpiar logs
            $('.cm-btn-clear').on('click', function (e) {
                e.preventDefault();
                self.clearLogs();
            });

            // Rotar iPhone
            $('.cm-btn-rotate').on('click', function (e) {
                e.preventDefault();
                self.rotateIphone();
            });

            // Cambio de dispositivo iPhone
            $(document).on('change', '#cm-device-selector', function () {
                var deviceId = $(this).val();
                self.changeDevice(deviceId);
            });

            // Overlay y clicks fuera para cerrar
            this.elements.$overlay.on('click', function () {
                self.closeActivePanel();
            });

            $(document).on('click', function (e) {
                if (self.state.isExpanded &&
                    !$(e.target).closest('.cm-floating-container').length) {
                    self.collapseButtons();
                }
            });

            // Escape para cerrar
            $(document).on('keyup', function (e) {
                if (e.keyCode === 27 && self.state.activePanel) {
                    self.closeActivePanel();
                }
            });

            // Atajos de teclado
            $(document).on('keydown', function (e) {
                // Ctrl+Shift+C para terminal
                if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                    e.preventDefault();
                    self.selectTerminal();
                }

                // Ctrl+Shift+M para iPhone
                if (e.ctrlKey && e.shiftKey && e.keyCode === 77) {
                    e.preventDefault();
                    self.selectIphone();
                }
            });
        },

        // Configurar funcionalidad de arrastrar
        setupDragging: function () {
            var self = this;
            var $container = this.elements.$container;
            var longPressTimer;
            var hasMovedThreshold = false;
            var MOVE_THRESHOLD = 5;

            // Eventos de mouse
            $container.on('mousedown', function (e) {
                if (e.which !== 1) return;

                self.dragState.startX = e.clientX;
                self.dragState.startY = e.clientY;
                hasMovedThreshold = false;

                var rect = $container[0].getBoundingClientRect();
                self.dragState.offsetX = e.clientX - rect.left;
                self.dragState.offsetY = e.clientY - rect.top;

                longPressTimer = setTimeout(function () {
                    if (!hasMovedThreshold) {
                        self.startDragging();
                    }
                }, 500);

                $(document).on('mousemove.drag', function (e) {
                    var deltaX = Math.abs(e.clientX - self.dragState.startX);
                    var deltaY = Math.abs(e.clientY - self.dragState.startY);
                    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    if (distance > MOVE_THRESHOLD) {
                        hasMovedThreshold = true;
                        clearTimeout(longPressTimer);

                        if (!self.dragState.isDragging) {
                            self.startDragging();
                        }
                    }

                    if (self.dragState.isDragging) {
                        self.onDrag(e);
                    }
                });

                $(document).on('mouseup.drag', function (e) {
                    clearTimeout(longPressTimer);
                    $(document).off('.drag');

                    if (self.dragState.isDragging) {
                        self.stopDragging();
                    }
                });
            });

            // Eventos touch para móviles
            $container.on('touchstart', function (e) {
                var touch = e.originalEvent.touches[0];
                self.dragState.startX = touch.clientX;
                self.dragState.startY = touch.clientY;
                hasMovedThreshold = false;

                var rect = $container[0].getBoundingClientRect();
                self.dragState.offsetX = touch.clientX - rect.left;
                self.dragState.offsetY = touch.clientY - rect.top;

                longPressTimer = setTimeout(function () {
                    if (!hasMovedThreshold) {
                        self.startDragging();
                    }
                }, 500);
            });

            $container.on('touchmove', function (e) {
                var touch = e.originalEvent.touches[0];
                var deltaX = Math.abs(touch.clientX - self.dragState.startX);
                var deltaY = Math.abs(touch.clientY - self.dragState.startY);
                var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (distance > MOVE_THRESHOLD) {
                    hasMovedThreshold = true;
                    clearTimeout(longPressTimer);

                    if (!self.dragState.isDragging) {
                        self.startDragging();
                    }
                }

                if (self.dragState.isDragging) {
                    e.preventDefault();
                    self.onDrag({ clientX: touch.clientX, clientY: touch.clientY });
                }
            });

            $container.on('touchend', function (e) {
                clearTimeout(longPressTimer);

                if (self.dragState.isDragging) {
                    self.stopDragging();
                }
            });
        },

        // Iniciar arrastre
        startDragging: function () {
            this.dragState.isDragging = true;
            this.elements.$container.addClass('dragging');

            if (this.state.isExpanded) {
                this.collapseButtons();
            }

            console.log('🔄 Started dragging button');
        },

        // Durante el arrastre
        onDrag: function (e) {
            if (!this.dragState.isDragging) return;

            var newX = e.clientX - this.dragState.offsetX;
            var newY = e.clientY - this.dragState.offsetY;

            var maxX = window.innerWidth - this.elements.$container.outerWidth();
            var maxY = window.innerHeight - this.elements.$container.outerHeight();

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            this.elements.$container.css({
                position: 'fixed',
                left: newX + 'px',
                top: newY + 'px',
                bottom: 'auto',
                right: 'auto'
            });
        },

        // Finalizar arrastre
        stopDragging: function () {
            var self = this;

            this.dragState.isDragging = false;
            this.elements.$container.removeClass('dragging');

            this.snapToCorner();

            // Guardar posición en localStorage
            setTimeout(function () {
                self.saveButtonPosition();
                self.dragState.isDragging = false;
            }, 100);

            console.log('✅ Stopped dragging button');
        },

        // Wrapper para animaciones suaves con requestAnimationFrame
        animateWithRAF: function (callback, duration = 300) {
            const start = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);

                // Easing suave
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                callback(easeProgress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        },

        // Snap a la esquina más cercana usando requestAnimationFrame
        snapToCorner: function () {
            var rect = this.elements.$container[0].getBoundingClientRect();
            var centerX = rect.left + rect.width / 2;
            var centerY = rect.top + rect.height / 2;

            var windowCenterX = window.innerWidth / 2;
            var windowCenterY = window.innerHeight / 2;

            var targetX, targetY;
            var position;

            if (centerX < windowCenterX && centerY < windowCenterY) {
                // Top-left
                targetX = 20;
                targetY = 20;
                position = 'top-left';
            } else if (centerX >= windowCenterX && centerY < windowCenterY) {
                // Top-right
                targetX = window.innerWidth - this.elements.$container.outerWidth() - 20;
                targetY = 20;
                position = 'top-right';
            } else if (centerX < windowCenterX && centerY >= windowCenterY) {
                // Bottom-left
                targetX = 20;
                targetY = window.innerHeight - this.elements.$container.outerHeight() - 20;
                position = 'bottom-left';
            } else {
                // Bottom-right
                targetX = window.innerWidth - this.elements.$container.outerWidth() - 20;
                targetY = window.innerHeight - this.elements.$container.outerHeight() - 20;
                position = 'bottom-right';
            }

            // Guardar la posición calculada para el localStorage
            this.currentPosition = position;

            // Usar RAF en lugar de jQuery animate
            const startX = parseFloat(this.elements.$container.css('left'));
            const startY = parseFloat(this.elements.$container.css('top'));
            const deltaX = targetX - startX;
            const deltaY = targetY - startY;

            const self = this;
            this.animateWithRAF(function (progress) {
                const currentX = startX + (deltaX * progress);
                const currentY = startY + (deltaY * progress);

                self.elements.$container.css({
                    left: currentX + 'px',
                    top: currentY + 'px'
                });
            }, 300);
        },

        // Toggle expandir botones
        toggleExpanded: function () {
            if (this.state.activePanel) {
                this.closeActivePanel();
                return;
            }

            if (this.state.isExpanded) {
                this.collapseButtons();
            } else {
                this.expandButtons();
            }
        },

        // Expandir botones con animación
        expandButtons: function () {
            this.state.isExpanded = true;
            this.elements.$container.addClass('expanded');

            this.elements.$btn.find('.cm-btn-icon').text('⚙️');
            this.elements.$btn.find('.cm-btn-text').text('Seleccionar');
        },

        // Colapsar botones
        collapseButtons: function () {
            this.state.isExpanded = false;
            this.elements.$container.removeClass('expanded');

            this.elements.$btn.find('.cm-btn-icon').text('🔧');
            this.elements.$btn.find('.cm-btn-text').text('Debug');
        },

        // Seleccionar Terminal
        selectTerminal: function () {
            if (this.state.isTransforming) return;

            this.state.isTransforming = true;
            this.state.activePanel = 'terminal';

            this.elements.$container.removeClass('expanded').addClass('transforming-terminal');

            this.elements.$btn.find('.cm-btn-icon').text('🐛');
            this.elements.$btn.find('.cm-btn-text').text('Terminal');

            var self = this;
            setTimeout(function () {
                self.elements.$container.removeClass('transforming-terminal').addClass('terminal-active');
                self.elements.$overlay.addClass('show');
                self.elements.$terminal.addClass('show');
                self.refreshLogs();
                self.state.isTransforming = false;
                self.state.isExpanded = false;
            }, 800);
        },

        // Seleccionar iPhone
        selectIphone: function () {
            if (this.state.isTransforming) return;

            this.state.isTransforming = true;
            this.state.activePanel = 'iphone';

            this.elements.$container.removeClass('expanded').addClass('transforming-iphone');

            this.elements.$btn.find('.cm-btn-icon').text('📱');
            this.elements.$btn.find('.cm-btn-text').text('TicTac');

            var self = this;
            setTimeout(function () {
                self.elements.$container.removeClass('transforming-iphone').addClass('iphone-active');
                self.elements.$overlay.addClass('show');
                self.elements.$iphone.addClass('show');

                setTimeout(function () {
                    self.updateDeviceDisplay();
                }, 100);

                self.state.isTransforming = false;
                self.state.isExpanded = false;
            }, 800);
        },

        // Cerrar panel activo
        closeActivePanel: function () {
            var self = this;

            if (!this.state.activePanel) return;

            this.elements.$overlay.removeClass('show');
            this.elements.$terminal.removeClass('show');
            this.elements.$iphone.removeClass('show');

            setTimeout(function () {
                self.elements.$container.removeClass('terminal-active iphone-active');
                self.elements.$btn.find('.cm-btn-icon').text('🔧');
                self.elements.$btn.find('.cm-btn-text').text('Debug');
                self.state.activePanel = null;
                self.state.isExpanded = false;
            }, 500);
        },

        // Cambiar dispositivo iPhone
        changeDevice: function (deviceId) {
            if (!this.state.deviceSpecs[deviceId]) return;

            this.state.currentDevice = deviceId;
            this.updateDeviceDisplay();
        },

        // Actualizar display del dispositivo
        updateDeviceDisplay: function () {
            var device = this.state.deviceSpecs[this.state.currentDevice];
            if (!device) return;

            var $iframe = $('#cm-iphone-iframe');
            var $screen = $('.cm-iphone-screen');
            var $frame = $('#cm-iphone-frame');
            var $panel = $('#cm-iphone');

            // Cambiar clases CSS según el tipo de dispositivo
            $frame.removeClass('device-phone device-tablet');
            $frame.addClass('device-' + device.type);

            // Cambiar el ancho del panel según el tipo de dispositivo
            if (device.type === 'tablet') {
                $panel.addClass('tablet-mode').css('width', '500px');
            } else {
                $panel.removeClass('tablet-mode').css('width', '380px');
            }

            // Agregar/quitar clase landscape según orientación
            if (this.state.iphoneOrientation === 'landscape') {
                $frame.addClass('landscape');
            } else {
                $frame.removeClass('landscape');
            }

            // Esperar a que el elemento esté completamente visible
            if ($frame.is(':visible')) {
                var frameRect = $frame[0].getBoundingClientRect();
                var containerWidth = frameRect.width - 30;
                var containerHeight = frameRect.height - 30;

                // Forzar que el iframe ocupe EXACTAMENTE las dimensiones del contenedor
                $iframe.attr({
                    width: containerWidth,
                    height: containerHeight
                }).css({
                    width: containerWidth + 'px',
                    height: containerHeight + 'px',
                    border: 'none',
                    display: 'block'
                });

                // El screen debe ocupar todo el espacio
                $screen.css({
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    overflow: 'hidden'
                });

                // Actualizar info del dispositivo con icono según tipo
                var deviceIcon = device.type === 'tablet' ? '📋' : '📱';
                var displayText = deviceIcon + ' ' + device.name + ' • Simulando en ' + Math.round(containerWidth) + '×' + Math.round(containerHeight);
                if (this.state.iphoneOrientation === 'landscape') {
                    displayText += ' (Landscape)';
                }
                $('#cm-device-info').text(displayText);

                console.log('Device display updated:', {
                    device: device.name,
                    type: device.type,
                    panelWidth: device.type === 'tablet' ? '500px' : '380px',
                    containerSize: Math.round(containerWidth) + 'x' + Math.round(containerHeight),
                    originalDevice: device.width + 'x' + device.height,
                    orientation: this.state.iphoneOrientation
                });
            }
        },

        // Cargar logs iniciales
        loadInitialLogs: function () {
            if (window.CMPro && window.CMPro.logs) {
                this.state.terminalLogs = window.CMPro.logs.slice();
            }

            this.getPhpLogs();
        },

        // Obtener logs PHP
        getPhpLogs: function () {
            var self = this;

            $.post(cmData.ajax_url, {
                action: 'cm_get_logs',
                nonce: cmData.nonce
            }, function (response) {
                if (response.success && response.data.php_logs) {
                    var allLogs = self.state.terminalLogs.concat(response.data.php_logs);

                    allLogs.sort(function (a, b) {
                        return new Date('1970/01/01 ' + a.time) - new Date('1970/01/01 ' + b.time);
                    });

                    self.state.terminalLogs = allLogs;
                    self.renderLogs();
                }
            });
        },

        // Refrescar logs
        refreshLogs: function () {
            var self = this;

            if (window.CMPro && window.CMPro.logs) {
                var jsLogs = window.CMPro.logs.slice();

                var newJsLogs = jsLogs.slice(this.state.terminalLogs.filter(function (l) {
                    return !l.source || l.source.includes('.php');
                }).length);

                if (newJsLogs.length > 0) {
                    this.state.terminalLogs = this.state.terminalLogs.concat(newJsLogs);
                }
            }

            this.getPhpLogs();
        },

        // MODIFICADO: Renderizar logs con sistema de cache Y FILTROS
        renderLogs: function () {
            var $container = this.elements.$logs;
            var self = this;

            // Actualizar contadores primero
            this.updateCategoryCounters();

            // Obtener logs filtrados
            var filteredLogs = this.getFilteredLogs();
            var currentLogCount = filteredLogs.length;

            if (currentLogCount === 0) {
                const filterName = this.state.errorCategories[this.state.activeFilter].label;
                $container.html(
                    '<div class="cm-logs-empty">' +
                    '<div class="cm-logs-empty-icon">🔍</div>' +
                    '<div class="cm-logs-empty-text">No hay logs de tipo "' + filterName + '"<br>Prueba con otro filtro o ejecuta código</div>' +
                    '</div>'
                );

                // Insertar filtros si no existen
                if ($('.cm-filter-bar').length === 0) {
                    $container.before(this.renderFilterButtons());
                }

                this.logCache.renderedCount = 0;
                return;
            }

            // Insertar filtros si no existen
            if ($('.cm-filter-bar').length === 0) {
                $container.before(this.renderFilterButtons());
            }

            var now = performance.now();

            // Para filtros: siempre re-render completo (cache se resetea al cambiar filtro)
            var fragment = document.createDocumentFragment();

            filteredLogs.forEach(function (log) {
                var logElement = self.createLogElement(log);
                fragment.appendChild(logElement);
            });

            // Limpiar y agregar todo de una vez
            $container.empty();
            $container[0].appendChild(fragment);

            this.logCache.fragment = fragment;
            this.logCache.renderedCount = currentLogCount;
            this.logCache.lastRenderTime = now;

            // Scroll y contador
            $container.scrollTop($container[0].scrollHeight);

            // Actualizar footer con info del filtro
            const filterName = this.state.errorCategories[this.state.activeFilter].label;
            const totalLogs = this.state.terminalLogs.length;
            let footerText = `${currentLogCount} logs`;
            if (this.state.activeFilter !== 'all') {
                footerText += ` (${filterName} de ${totalLogs} totales)`;
            }
            $('.cm-logs-count').text(footerText);

            console.log(`📊 Logs rendered: ${currentLogCount} filtered (${this.state.activeFilter}) - took ${(performance.now() - now).toFixed(2)}ms`);
        },

        // Función helper para crear elementos de log
        createLogElement: function (log) {
            var typeClass = log.type.toLowerCase();
            var time = log.time || log.timestamp || '';
            var source = log.source || '';

            // NUEVO: Agregar clase de categoría para styling
            var category = this.categorizeLog(log);

            var logDiv = document.createElement('div');
            logDiv.className = `cm-log-item cm-category-${category}`;

            logDiv.innerHTML =
                '<span class="cm-log-type ' + typeClass + '">' + log.type.toUpperCase() + '</span>' +
                '<div class="cm-log-content">' +
                '<div class="cm-log-message">' + this.escapeHtml(log.message) + '</div>' +
                '<div class="cm-log-meta">' +
                '<span class="cm-log-time">' + time + '</span>' +
                (source ? '<span class="cm-log-source">' + source + '</span>' : '') +
                '<span class="cm-log-category" title="Categoría: ' + category + '">' + this.state.errorCategories[category].icon + '</span>' +
                '</div>' +
                '</div>';

            return logDiv;
        },

        // Renderizar item de log (mantenido para compatibilidad)
        renderLogItem: function (log) {
            var typeClass = log.type.toLowerCase();
            var time = log.time || log.timestamp || '';
            var source = log.source || '';

            return '<div class="cm-log-item">' +
                '<span class="cm-log-type ' + typeClass + '">' + log.type.toUpperCase() + '</span>' +
                '<div class="cm-log-content">' +
                '<div class="cm-log-message">' + this.escapeHtml(log.message) + '</div>' +
                '<div class="cm-log-meta">' +
                '<span class="cm-log-time">' + time + '</span>' +
                (source ? '<span class="cm-log-source">' + source + '</span>' : '') +
                '</div>' +
                '</div>' +
                '</div>';
        },

        // MODIFICADO: Limpiar logs y cache y filtros
        clearLogs: function () {
            var self = this;

            if (window.CMPro) {
                window.CMPro.logs = [];
            }

            $.post(cmData.ajax_url, {
                action: 'cm_clear_logs',
                nonce: cmData.nonce
            }, function (response) {
                if (response.success) {
                    self.state.terminalLogs = [];

                    // Limpiar cache
                    self.logCache.renderedCount = 0;
                    self.logCache.fragment = null;

                    // Reset filtro a 'all'
                    self.state.activeFilter = 'all';

                    self.renderLogs();
                }
            });
        },

        // Rotar iPhone
        rotateIphone: function () {
            if (this.state.iphoneOrientation === 'portrait') {
                this.state.iphoneOrientation = 'landscape';
            } else {
                this.state.iphoneOrientation = 'portrait';
            }

            this.updateDeviceDisplay();

            var $frame = $('#cm-iphone-frame');
            $frame.addClass('rotating');

            setTimeout(function () {
                $frame.removeClass('rotating');
            }, 600);

            var self = this;
            setTimeout(function () {
                var $iframe = $('#cm-iphone-iframe');
                var currentSrc = $iframe.attr('src');
                $iframe.attr('src', currentSrc);
            }, 300);
        },

        // Escape HTML
        escapeHtml: function (text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // Guardar posición del botón en localStorage
        saveButtonPosition: function () {
            try {
                var position = {
                    corner: this.currentPosition || 'bottom-left',
                    timestamp: Date.now()
                };
                localStorage.setItem('cm_button_position', JSON.stringify(position));
                console.log('💾 Button position saved:', position.corner);
            } catch (e) {
                console.warn('Could not save button position:', e);
            }
        },

        // Restaurar posición del botón desde localStorage
        restoreButtonPosition: function () {
            try {
                var saved = localStorage.getItem('cm_button_position');
                if (saved) {
                    var position = JSON.parse(saved);
                    this.setButtonPosition(position.corner);
                    console.log('📍 Button position restored:', position.corner);
                } else {
                    // Posición por defecto: bottom-left
                    this.setButtonPosition('bottom-left');
                }
            } catch (e) {
                console.warn('Could not restore button position:', e);
                this.setButtonPosition('bottom-left');
            }
        },

        // Establecer posición del botón
        setButtonPosition: function (corner) {
            var targetX, targetY;

            switch (corner) {
                case 'top-left':
                    targetX = 20;
                    targetY = 20;
                    break;
                case 'top-right':
                    targetX = window.innerWidth - this.elements.$container.outerWidth() - 20;
                    targetY = 20;
                    break;
                case 'bottom-left':
                    targetX = 20;
                    targetY = window.innerHeight - this.elements.$container.outerHeight() - 20;
                    break;
                case 'bottom-right':
                default:
                    targetX = window.innerWidth - this.elements.$container.outerWidth() - 20;
                    targetY = window.innerHeight - this.elements.$container.outerHeight() - 20;
                    break;
            }

            this.elements.$container.css({
                position: 'fixed',
                left: targetX + 'px',
                top: targetY + 'px',
                bottom: 'auto',
                right: 'auto'
            });

            this.currentPosition = corner;
        }
    };

    // Auto-inicializar
    $(document).ready(function () {
        ConsoleMonitor.init();
    });

})(jQuery);