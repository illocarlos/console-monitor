/**
 * Console Monitor Pro - JavaScript Simplificado
 * Solo Terminal y iPhone/Tablet, nada más
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

        // Inicializar
        init: function () {
            this.cacheElements();
            this.bindEvents();
            this.setupDragging();
            this.loadInitialLogs();
            this.restoreButtonPosition(); // Restaurar posición guardada

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

        // Snap a la esquina más cercana
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

            this.elements.$container.animate({
                left: targetX + 'px',
                top: targetY + 'px'
            }, {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            });
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
            var $panel = $('#cm-iphone'); // El panel contenedor

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

        // Renderizar logs
        renderLogs: function () {
            var $container = this.elements.$logs;
            var self = this;

            if (this.state.terminalLogs.length === 0) {
                $container.html(
                    '<div class="cm-logs-empty">' +
                    '<div class="cm-logs-empty-icon">🐛</div>' +
                    '<div class="cm-logs-empty-text">No hay logs aún<br>Ejecuta console.log() para ver resultados</div>' +
                    '</div>'
                );
                return;
            }

            var html = '';

            this.state.terminalLogs.forEach(function (log) {
                html += self.renderLogItem(log);
            });

            $container.html(html);
            $container.scrollTop($container[0].scrollHeight);
            $('.cm-logs-count').text(this.state.terminalLogs.length + ' logs');
        },

        // Renderizar item de log
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

        // Limpiar logs
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