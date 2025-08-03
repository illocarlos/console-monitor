/**
 * Console Monitor Pro - Floating Menu JavaScript
 * Maneja toda la lógica del menú flotante y sus interacciones
 */

(function ($) {
    'use strict';

    // Namespace global
    window.ConsoleMonitorFloatingMenu = {

        // Configuración por defecto
        config: {
            position: 'bottom-right',
            menuItems: {},
            ajaxUrl: '',
            nonce: '',
            animationDuration: 300,
            autoCloseDelay: 5000,
            enableKeyboardNav: true,
            enableGestures: true
        },

        // Estado del menú
        state: {
            isOpen: false,
            isAnimating: false,
            currentPosition: 'bottom-right',
            activeItem: null,
            isDragging: false,
            hasActiveTools: false,
            lastInteraction: null
        },

        // Elementos del DOM
        elements: {
            $button: null,
            $menu: null,
            $overlay: null,
            $menuItems: null,
            $quickActions: null
        },

        // Timers y animaciones
        timers: {
            autoClose: null,
            pulseAnimation: null,
            rippleCleanup: null
        },

        /**
         * Inicializar el menú flotante
         */
        init: function (options) {
            // Extender configuración
            this.config = $.extend(true, this.config, options);
            this.state.currentPosition = this.config.position;

            // Cachear elementos del DOM
            this.cacheElements();

            // Configurar eventos
            this.bindEvents();

            // Configurar atajos de teclado
            if (this.config.enableKeyboardNav) {
                this.setupKeyboardNavigation();
            }

            // Configurar gestos touch
            if (this.config.enableGestures) {
                this.setupTouchGestures();
            }

            // Inicializar estado visual
            this.updateVisualState();

            // Configurar observadores
            this.setupObservers();

            console.log('✅ Console Monitor Floating Menu initialized');
        },

        /**
         * Cachear elementos del DOM
         */
        cacheElements: function () {
            this.elements.$button = $('#cm-floating-button');
            this.elements.$menu = $('#cm-floating-menu');
            this.elements.$overlay = $('#cm-menu-overlay');
            this.elements.$menuItems = $('.cm-menu-item');
            this.elements.$quickActions = $('.cm-quick-btn');

            // Verificar que los elementos existen
            if (!this.elements.$button.length) {
                console.warn('⚠️ Floating button not found');
                return false;
            }

            return true;
        },

        /**
         * Configurar eventos
         */
        bindEvents: function () {
            var self = this;

            // Evento del botón principal
            this.elements.$button.on('click.cmFloatingMenu', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.toggleMenu();
            });

            // Eventos de elementos del menú
            this.elements.$menuItems.on('click.cmFloatingMenu', function (e) {
                e.preventDefault();
                var $item = $(this);
                var action = $item.data('action');
                var itemId = $item.data('item-id');

                self.handleMenuItemClick(action, itemId, $item);
            });

            // Eventos de acciones rápidas
            this.elements.$quickActions.on('click.cmFloatingMenu', function (e) {
                e.preventDefault();
                var action = $(this).data('action');
                self.handleQuickAction(action);
            });

            // Overlay para cerrar
            this.elements.$overlay.on('click.cmFloatingMenu', function (e) {
                self.closeMenu();
            });

            // Eventos globales
            $(document).on('keydown.cmFloatingMenu', function (e) {
                self.handleKeyDown(e);
            });

            $(window).on('resize.cmFloatingMenu', function () {
                self.handleWindowResize();
            });

            // Eventos de drag para reposicionar
            this.setupDragAndDrop();
        },

        /**
         * Toggle del menú principal
         */
        toggleMenu: function () {
            if (this.state.isAnimating) return;

            if (this.state.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        },

        /**
         * Abrir menú
         */
        openMenu: function () {
            if (this.state.isOpen || this.state.isAnimating) return;

            this.state.isAnimating = true;
            this.state.isOpen = true;
            this.state.lastInteraction = Date.now();

            // Actualizar clases
            this.elements.$button.addClass('active');
            this.elements.$overlay.show().addClass('active');

            // Mostrar menú con animación
            this.elements.$menu
                .addClass('entering')
                .show()
                .css({
                    opacity: 0,
                    transform: this.getMenuTransform(false)
                })
                .animate({
                    opacity: 1
                }, {
                    duration: this.config.animationDuration,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var progress = now;
                        var scale = 0.8 + (0.2 * progress);
                        var translateY = 20 - (20 * progress);
                        $(this).css('transform', 'scale(' + scale + ') translateY(' + translateY + 'px)');
                    },
                    complete: function () {
                        $(this).removeClass('entering').addClass('open');
                        this.state.isAnimating = false;
                        this.updateMenuItems();
                        this.setupAutoClose();
                        this.triggerEvent('menuOpened');
                    }.bind(this)
                });

            // Efecto ripple en el botón
            this.createRippleEffect(this.elements.$button, event);

            console.log('🎯 Menu opened');
        },

        /**
         * Cerrar menú
         */
        closeMenu: function () {
            if (!this.state.isOpen || this.state.isAnimating) return;

            this.state.isAnimating = true;
            this.state.isOpen = false;

            // Limpiar timer de auto-close
            this.clearAutoClose();

            // Actualizar clases
            this.elements.$button.removeClass('active');
            this.elements.$overlay.removeClass('active');

            // Ocultar menú con animación
            this.elements.$menu
                .addClass('leaving')
                .animate({
                    opacity: 0
                }, {
                    duration: this.config.animationDuration * 0.8,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var progress = 1 - now;
                        var scale = 0.9 + (0.1 * now);
                        var translateY = 10 * progress;
                        $(this).css('transform', 'scale(' + scale + ') translateY(' + translateY + 'px)');
                    },
                    complete: function () {
                        $(this).removeClass('leaving open').hide();
                        this.elements.$overlay.hide();
                        this.state.isAnimating = false;
                        this.triggerEvent('menuClosed');
                    }.bind(this)
                });

            console.log('❌ Menu closed');
        },

        /**
         * Manejar clic en elemento del menú
         */
        handleMenuItemClick: function (action, itemId, $item) {
            // Efectos visuales
            this.createRippleEffect($item, event);
            $item.addClass('active');

            console.log('🔥 Menu item clicked:', action, itemId);

            // Ejecutar acción directamente
            switch (action) {
                case 'open_console':
                    this.openConsoleDirectly();
                    break;
                case 'open_mobile_viewer':
                    this.openMobileViewerDirectly();
                    break;
                default:
                    console.warn('Unknown action:', action);
            }

            // Cerrar menú después de un delay
            setTimeout(() => {
                this.closeMenu();
                $item.removeClass('active');
            }, 150);
        },

        /**
         * Abrir consola directamente
         */
        openConsoleDirectly: function () {
            console.log('🐛 Opening console directly...');

            var $consolePanel = $('#cm-console-panel');

            if ($consolePanel.length === 0) {
                console.error('❌ Console panel not found in DOM');
                alert('Console panel no encontrado. Verifica que el plugin esté correctamente instalado.');
                return;
            }

            // Mostrar panel directamente
            $consolePanel.show().addClass('active').css({
                display: 'flex',
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)'
            });

            // Si existe el objeto ConsoleMonitorConsole, usarlo
            if (window.ConsoleMonitorConsole && typeof window.ConsoleMonitorConsole.show === 'function') {
                window.ConsoleMonitorConsole.show();
            }

            console.log('✅ Console opened');
        },

        /**
         * Abrir mobile viewer directamente
         */
        openMobileViewerDirectly: function () {
            console.log('📱 Opening mobile viewer directly...');

            var $mobileViewer = $('#cm-mobile-viewer');

            if ($mobileViewer.length === 0) {
                console.error('❌ Mobile viewer not found in DOM');
                alert('Mobile viewer no encontrado. Verifica que el plugin esté correctamente instalado.');
                return;
            }

            // Mostrar viewer directamente
            $mobileViewer.show().addClass('active').css({
                display: 'flex',
                opacity: 1,
                transform: 'scale(1)'
            });

            // Si existe el objeto ConsoleMonitorMobileViewer, usarlo
            if (window.ConsoleMonitorMobileViewer && typeof window.ConsoleMonitorMobileViewer.show === 'function') {
                window.ConsoleMonitorMobileViewer.show();
            }

            console.log('✅ Mobile viewer opened');
        },

        /**
         * Manejar acciones rápidas
         */
        handleQuickAction: function (action) {
            switch (action) {
                case 'minimize_all':
                    this.minimizeAllTools();
                    break;
                case 'refresh_tools':
                    this.refreshAllTools();
                    break;
                case 'toggle_position':
                    this.togglePosition();
                    break;
                default:
                    console.warn('Unknown quick action:', action);
            }

            this.showNotification('Action: ' + action, 'info');
        },

        /**
         * Cambiar posición del menú
         */
        togglePosition: function () {
            var positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
            var currentIndex = positions.indexOf(this.state.currentPosition);
            var nextIndex = (currentIndex + 1) % positions.length;
            var newPosition = positions[nextIndex];

            this.updatePosition(newPosition);
        },

        /**
         * Actualizar posición del menú
         */
        updatePosition: function (newPosition) {
            var self = this;

            // Animar cambio de posición
            this.elements.$button.add(this.elements.$menu)
                .removeClass('cm-position-' + this.state.currentPosition)
                .addClass('cm-position-' + newPosition);

            this.state.currentPosition = newPosition;

            // Comunicar cambio al servidor
            $.post(this.config.ajaxUrl, {
                action: 'update_menu_position',
                position: newPosition,
                nonce: this.config.nonce
            }, function (response) {
                if (response.success) {
                    self.showNotification('Position: ' + newPosition.replace('-', ' '), 'success');
                }
            });

            console.log('📍 Position changed to:', newPosition);
        },

        /**
         * Configurar auto-close
         */
        setupAutoClose: function () {
            var self = this;

            this.timers.autoClose = setTimeout(function () {
                if (self.state.isOpen && !self.isMenuBeingUsed()) {
                    self.closeMenu();
                }
            }, this.config.autoCloseDelay);
        },

        /**
         * Limpiar auto-close
         */
        clearAutoClose: function () {
            if (this.timers.autoClose) {
                clearTimeout(this.timers.autoClose);
                this.timers.autoClose = null;
            }
        },

        /**
         * Verificar si el menú está siendo usado
         */
        isMenuBeingUsed: function () {
            var timeSinceLastInteraction = Date.now() - (this.state.lastInteraction || 0);
            return timeSinceLastInteraction < 2000; // 2 segundos
        },

        /**
         * Actualizar elementos del menú
         */
        updateMenuItems: function () {
            var self = this;

            this.elements.$menuItems.each(function () {
                var $item = $(this);
                var itemId = $item.data('item-id');
                var isActive = self.isToolActive(itemId);

                $item.toggleClass('active', isActive);

                // Animar entrada de elementos
                var delay = $item.index() * 50;
                setTimeout(function () {
                    $item.addClass('visible');
                }, delay);
            });
        },

        /**
         * Verificar si una herramienta está activa
         */
        isToolActive: function (toolId) {
            // Comunicarse con el controlador para obtener estado
            if (window.ConsoleMonitorController) {
                var activeTools = window.ConsoleMonitorController.state.activeTools;

                switch (toolId) {
                    case 'console-monitor':
                        return activeTools.console || false;
                    case 'mobile-viewer':
                        return activeTools.mobile || false;
                    case 'menu-settings':
                        return activeTools.settings || false;
                }
            }

            return false;
        },

        /**
         * Configurar navegación por teclado
         */
        setupKeyboardNavigation: function () {
            var self = this;

            $(document).on('keydown.cmFloatingMenuNav', function (e) {
                if (!self.state.isOpen) return;

                switch (e.keyCode) {
                    case 27: // Escape
                        e.preventDefault();
                        self.closeMenu();
                        break;
                    case 38: // Arrow Up
                        e.preventDefault();
                        self.navigateMenu('up');
                        break;
                    case 40: // Arrow Down
                        e.preventDefault();
                        self.navigateMenu('down');
                        break;
                    case 13: // Enter
                        e.preventDefault();
                        self.activateCurrentMenuItem();
                        break;
                }
            });
        },

        /**
         * Navegar por el menú con teclado
         */
        navigateMenu: function (direction) {
            var $items = this.elements.$menuItems.filter(':visible');
            var currentIndex = $items.index($items.filter('.keyboard-focus'));
            var newIndex;

            if (direction === 'up') {
                newIndex = currentIndex <= 0 ? $items.length - 1 : currentIndex - 1;
            } else {
                newIndex = currentIndex >= $items.length - 1 ? 0 : currentIndex + 1;
            }

            $items.removeClass('keyboard-focus');
            $items.eq(newIndex).addClass('keyboard-focus').focus();
        },

        /**
         * Activar elemento actual del menú
         */
        activateCurrentMenuItem: function () {
            var $activeItem = this.elements.$menuItems.filter('.keyboard-focus');

            if ($activeItem.length) {
                $activeItem.trigger('click');
            }
        },

        /**
         * Configurar gestos touch
         */
        setupTouchGestures: function () {
            var self = this;
            var startX, startY, startTime;

            this.elements.$button.on('touchstart.cmFloatingMenuGestures', function (e) {
                var touch = e.originalEvent.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTime = Date.now();
            });

            this.elements.$button.on('touchend.cmFloatingMenuGestures', function (e) {
                if (!startX || !startY) return;

                var touch = e.originalEvent.changedTouches[0];
                var endX = touch.clientX;
                var endY = touch.clientY;
                var endTime = Date.now();

                var diffX = Math.abs(endX - startX);
                var diffY = Math.abs(endY - startY);
                var duration = endTime - startTime;

                // Long press para abrir configuración
                if (duration > 500 && diffX < 10 && diffY < 10) {
                    e.preventDefault();
                    self.handleQuickAction('open_settings');
                }

                // Swipe para cambiar posición
                if (duration < 300 && (diffX > 50 || diffY > 50)) {
                    e.preventDefault();

                    if (diffX > diffY) {
                        // Swipe horizontal
                        if (endX > startX) {
                            self.swipeToPosition('right');
                        } else {
                            self.swipeToPosition('left');
                        }
                    } else {
                        // Swipe vertical
                        if (endY > startY) {
                            self.swipeToPosition('down');
                        } else {
                            self.swipeToPosition('up');
                        }
                    }
                }

                startX = startY = null;
            });
        },

        /**
         * Cambiar posición con swipe
         */
        swipeToPosition: function (direction) {
            var currentPos = this.state.currentPosition;
            var newPos;

            switch (direction) {
                case 'left':
                    newPos = currentPos.includes('right') ?
                        currentPos.replace('right', 'left') :
                        currentPos.replace('left', 'right');
                    break;
                case 'right':
                    newPos = currentPos.includes('left') ?
                        currentPos.replace('left', 'right') :
                        currentPos.replace('right', 'left');
                    break;
                case 'up':
                    newPos = currentPos.includes('bottom') ?
                        currentPos.replace('bottom', 'top') :
                        currentPos.replace('top', 'bottom');
                    break;
                case 'down':
                    newPos = currentPos.includes('top') ?
                        currentPos.replace('top', 'bottom') :
                        currentPos.replace('bottom', 'top');
                    break;
            }

            if (newPos && newPos !== currentPos) {
                this.updatePosition(newPos);
            }
        },

        /**
         * Configurar drag and drop
         */
        setupDragAndDrop: function () {
            var self = this;
            var isDragging = false;
            var startPos = { x: 0, y: 0 };
            var buttonOffset = { x: 0, y: 0 };

            this.elements.$button.on('mousedown.cmFloatingMenuDrag', function (e) {
                if (e.which !== 1) return; // Solo botón izquierdo

                isDragging = false;
                startPos.x = e.clientX;
                startPos.y = e.clientY;

                var offset = $(this).offset();
                buttonOffset.x = e.clientX - offset.left;
                buttonOffset.y = e.clientY - offset.top;

                $(document).on('mousemove.cmFloatingMenuDrag', function (e) {
                    var distance = Math.sqrt(
                        Math.pow(e.clientX - startPos.x, 2) +
                        Math.pow(e.clientY - startPos.y, 2)
                    );

                    if (distance > 5 && !isDragging) {
                        isDragging = true;
                        self.state.isDragging = true;
                        self.elements.$button.addClass('dragging');
                    }

                    if (isDragging) {
                        var newX = e.clientX - buttonOffset.x;
                        var newY = e.clientY - buttonOffset.y;

                        // Limitar a los bordes de la ventana
                        var maxX = $(window).width() - self.elements.$button.outerWidth();
                        var maxY = $(window).height() - self.elements.$button.outerHeight();

                        newX = Math.max(0, Math.min(newX, maxX));
                        newY = Math.max(0, Math.min(newY, maxY));

                        self.elements.$button.css({
                            left: newX + 'px',
                            top: newY + 'px',
                            right: 'auto',
                            bottom: 'auto'
                        });
                    }
                });

                $(document).on('mouseup.cmFloatingMenuDrag', function (e) {
                    $(document).off('.cmFloatingMenuDrag');

                    if (isDragging) {
                        setTimeout(function () {
                            self.state.isDragging = false;
                            self.elements.$button.removeClass('dragging');
                            self.snapToNearestCorner();
                        }, 100);
                    }

                    isDragging = false;
                });
            });
        },

        /**
         * Ajustar a la esquina más cercana
         */
        snapToNearestCorner: function () {
            var $window = $(window);
            var $button = this.elements.$button;
            var buttonPos = $button.offset();
            var buttonCenter = {
                x: buttonPos.left + $button.outerWidth() / 2,
                y: buttonPos.top + $button.outerHeight() / 2
            };

            var windowCenter = {
                x: $window.width() / 2,
                y: $window.height() / 2
            };

            var newPosition;

            if (buttonCenter.x < windowCenter.x) {
                // Lado izquierdo
                newPosition = buttonCenter.y < windowCenter.y ? 'top-left' : 'bottom-left';
            } else {
                // Lado derecho
                newPosition = buttonCenter.y < windowCenter.y ? 'top-right' : 'bottom-right';
            }

            // Animar a la nueva posición
            $button.animate({
                left: '',
                top: '',
                right: '',
                bottom: ''
            }, {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                complete: function () {
                    self.updatePosition(newPosition);
                }
            });
        },

        /**
         * Crear efecto ripple
         */
        createRippleEffect: function ($element, event) {
            var $ripple = $('<div class="cm-ripple"></div>');
            var offset = $element.offset();
            var x = (event ? event.clientX : $element.width() / 2) - offset.left;
            var y = (event ? event.clientY : $element.height() / 2) - offset.top;

            $ripple.css({
                position: 'absolute',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(0)',
                left: x + 'px',
                top: y + 'px',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                zIndex: 1000
            });

            $element.css('position', 'relative').append($ripple);

            var size = Math.max($element.width(), $element.height()) * 2;

            $ripple.animate({
                width: size + 'px',
                height: size + 'px',
                left: (x - size / 2) + 'px',
                top: (y - size / 2) + 'px',
                opacity: 0
            }, {
                duration: 600,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                step: function (now, fx) {
                    if (fx.prop === 'width') {
                        var scale = now / size;
                        $(this).css('transform', 'scale(' + scale + ')');
                    }
                },
                complete: function () {
                    $(this).remove();
                }
            });
        },

        /**
         * Obtener transformación del menú
         */
        getMenuTransform: function (isOpen) {
            var scale = isOpen ? 1 : 0.8;
            var translateY = isOpen ? 0 : 20;
            return 'scale(' + scale + ') translateY(' + translateY + 'px)';
        },

        /**
         * Manejar redimensionamiento de ventana
         */
        handleWindowResize: function () {
            // Recalcular posición si es necesario
            if (this.state.isDragging) return;

            this.adjustPositionForViewport();
        },

        /**
         * Ajustar posición para viewport
         */
        adjustPositionForViewport: function () {
            // Implementación para ajustar la posición cuando cambia el viewport
            var $window = $(window);

            if ($window.width() < 768) {
                // En móvil, centrar el menú
                this.elements.$menu.css({
                    left: '50%',
                    transform: 'translateX(-50%)'
                });
            }
        },

        /**
         * Configurar observadores
         */
        setupObservers: function () {
            var self = this;

            // Observar cambios en el estado de las herramientas
            $(document).on('toolStateChanged.cmFloatingMenu', function (e, data) {
                self.state.hasActiveTools = Object.values(data.activeTools || {}).some(Boolean);
                self.updateVisualState();
            });

            // Observar cambios de tema
            if (window.matchMedia) {
                var darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
                darkModeQuery.addListener(function () {
                    self.updateTheme();
                });
            }
        },

        /**
         * Actualizar estado visual
         */
        updateVisualState: function () {
            this.elements.$button.toggleClass('has-active-tools', this.state.hasActiveTools);

            if (this.state.hasActiveTools && !this.timers.pulseAnimation) {
                this.startPulseAnimation();
            } else if (!this.state.hasActiveTools && this.timers.pulseAnimation) {
                this.stopPulseAnimation();
            }
        },

        /**
         * Iniciar animación de pulse
         */
        startPulseAnimation: function () {
            var $pulse = this.elements.$button.find('.cm-btn-pulse');
            if (!$pulse.length) return;

            this.timers.pulseAnimation = setInterval(function () {
                $pulse.css({
                    transform: 'scale(1)',
                    opacity: 0.7
                }).animate({
                    transform: 'scale(1.3)',
                    opacity: 0
                }, {
                    duration: 2000,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                });
            }, 2000);
        },

        /**
         * Detener animación de pulse
         */
        stopPulseAnimation: function () {
            if (this.timers.pulseAnimation) {
                clearInterval(this.timers.pulseAnimation);
                this.timers.pulseAnimation = null;
            }
        },

        /**
         * Comunicar con el controlador
         */
        notifyController: function (eventType, data) {
            if (window.ConsoleMonitorController) {
                window.ConsoleMonitorController.handleMenuAction(data.action, data.itemId);
            }

            // También disparar evento personalizado
            this.triggerEvent(eventType, data);
        },

        /**
         * Disparar evento personalizado
         */
        triggerEvent: function (eventType, data) {
            $(document).trigger('cmFloatingMenu:' + eventType, [data]);
        },

        /**
         * Mostrar notificación
         */
        showNotification: function (message, type) {
            if (window.ConsoleMonitorController) {
                window.ConsoleMonitorController.showNotification(message, type);
            }
        },

        /**
         * Minimizar todas las herramientas
         */
        minimizeAllTools: function () {
            this.notifyController('minimize_all', {});
        },

        /**
         * Refrescar todas las herramientas
         */
        refreshAllTools: function () {
            this.notifyController('refresh_tools', {});
        },

        /**
         * Manejar teclas presionadas
         */
        handleKeyDown: function (e) {
            // Implementación adicional de atajos de teclado
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                this.toggleMenu();
            }
        },

        /**
         * Actualizar tema
         */
        updateTheme: function () {
            // Actualizar colores basado en el tema del sistema
            var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.elements.$button.toggleClass('dark-theme', isDark);
            this.elements.$menu.toggleClass('dark-theme', isDark);
        },

        /**
         * Destruir instancia
         */
        destroy: function () {
            // Limpiar eventos
            this.elements.$button.off('.cmFloatingMenu');
            this.elements.$menuItems.off('.cmFloatingMenu');
            this.elements.$quickActions.off('.cmFloatingMenu');
            this.elements.$overlay.off('.cmFloatingMenu');
            $(document).off('.cmFloatingMenu');
            $(window).off('.cmFloatingMenu');

            // Limpiar timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Reset estado
            this.state = {
                isOpen: false,
                isAnimating: false,
                currentPosition: 'bottom-right',
                activeItem: null,
                isDragging: false,
                hasActiveTools: false,
                lastInteraction: null
            };

            console.log('🗑️ Floating Menu destroyed');
        }
    };

})(jQuery);