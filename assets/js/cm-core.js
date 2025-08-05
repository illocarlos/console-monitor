/**
 * Console Monitor Pro - JavaScript CORE
 * assets/js/cm-core.js
 * Sistema base: botón flotante, drag & drop, navegación entre paneles
 */

(function ($) {
    'use strict';

    // Sistema base global
    window.ConsoleMonitor = {

        // Estado base
        state: {
            isExpanded: false,
            activePanel: null, // 'terminal' | 'iphone' | 'notes' | null
            isTransforming: false
        },

        // Elementos DOM base
        elements: {
            $container: null,
            $btn: null,
            $overlay: null
        },

        // Estado del drag
        dragState: {
            isDragging: false,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0
        },

        // ========================================
        // INICIALIZACIÓN
        // ========================================

        init: function () {
            this.cacheElements();
            this.bindEvents();
            this.setupDragging();
            this.restoreButtonPosition();

            console.log('✅ Console Monitor Core initialized');
        },

        // Cachear elementos DOM
        cacheElements: function () {
            this.elements.$container = $('.cm-floating-container');
            this.elements.$btn = $('#cm-floating-btn');
            this.elements.$overlay = $('#cm-overlay');
        },

        // ========================================
        // EVENTOS BASE
        // ========================================

        bindEvents: function () {
            var self = this;

            // Click en botón flotante principal
            this.elements.$btn.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.dragState.isDragging) {
                    self.toggleExpanded();
                }
            });

            // Click en botones de opciones (delegado)
            $(document).on('click', '.cm-option-btn', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const panel = $(this).data('panel') || $(this).attr('class').match(/cm-option-btn\s+(\w+)/)?.[1];
                if (panel) {
                    self.selectPanel(panel);
                }
            });

            // Cerrar paneles
            $('.cm-btn-close').on('click', function (e) {
                e.preventDefault();
                self.closeActivePanel();
            });

            // Overlay para cerrar
            this.elements.$overlay.on('click', function () {
                self.closeActivePanel();
            });

            // Clicks fuera para colapsar
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

            // Atajos de teclado base
            $(document).on('keydown', function (e) {
                // Ctrl+Shift+C para terminal
                if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                    e.preventDefault();
                    self.selectPanel('terminal');
                }

                // Ctrl+Shift+M para iPhone
                if (e.ctrlKey && e.shiftKey && e.keyCode === 77) {
                    e.preventDefault();
                    self.selectPanel('iphone');
                }

                // Ctrl+Shift+N para notas
                if (e.ctrlKey && e.shiftKey && e.keyCode === 78) {
                    e.preventDefault();
                    self.selectPanel('notes');
                }
            });
        },

        // ========================================
        // NAVEGACIÓN ENTRE PANELES
        // ========================================

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

        // Expandir botones
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

        // Seleccionar panel genérico
        selectPanel: function (panelType) {
            if (this.state.isTransforming) return;

            // Mapeo de iconos y textos
            const panelConfig = {
                'terminal': { icon: '🐛', text: 'Terminal', color: 'terminal' },
                'iphone': { icon: '📱', text: 'Mobile', color: 'iphone' },
                'notes': { icon: '📝', text: 'Notas', color: 'notes' }
            };

            const config = panelConfig[panelType];
            if (!config) return;

            this.state.isTransforming = true;
            this.state.activePanel = panelType;

            // Iniciar transformación
            this.elements.$container
                .removeClass('expanded')
                .addClass(`transforming-${panelType}`);

            // Cambiar icono del botón
            this.elements.$btn.find('.cm-btn-icon').text(config.icon);
            this.elements.$btn.find('.cm-btn-text').text(config.text);

            const self = this;
            setTimeout(function () {
                // Completar transformación
                self.elements.$container
                    .removeClass(`transforming-${panelType}`)
                    .addClass(`${panelType}-active`);

                // Mostrar panel y overlay
                self.elements.$overlay.addClass('show');
                $(`#cm-${panelType}`).addClass('show');

                // Llamar función específica del módulo si existe
                const moduleFunction = `select${panelType.charAt(0).toUpperCase() + panelType.slice(1)}`;
                if (typeof self[moduleFunction] === 'function') {
                    self[moduleFunction]();
                }

                // Trigger evento personalizado para módulos
                $(document).trigger('cm:panel:opened', [panelType]);

                self.state.isTransforming = false;
                self.state.isExpanded = false;
            }, 800);
        },

        // Cerrar panel activo
        closeActivePanel: function () {
            var self = this;

            if (!this.state.activePanel) return;

            // Ocultar overlay y todos los paneles
            this.elements.$overlay.removeClass('show');
            $('.cm-panel').removeClass('show');

            // Trigger evento de cierre
            $(document).trigger('cm:panel:closed', [this.state.activePanel]);

            setTimeout(function () {
                // Resetear estado del botón
                self.elements.$container.removeClass('terminal-active iphone-active notes-active');
                self.elements.$btn.find('.cm-btn-icon').text('🔧');
                self.elements.$btn.find('.cm-btn-text').text('Debug');

                self.state.activePanel = null;
                self.state.isExpanded = false;
            }, 500);
        },

        // ========================================
        // SISTEMA DE DRAG & DROP
        // ========================================

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

            // Guardar posición
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

            this.currentPosition = position;

            // Animación suave usando requestAnimationFrame
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

        // Wrapper para animaciones con RAF
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

        // ========================================
        // POSICIONAMIENTO PERSISTENTE
        // ========================================

        // Guardar posición en localStorage
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

        // Restaurar posición desde localStorage
        restoreButtonPosition: function () {
            try {
                var saved = localStorage.getItem('cm_button_position');
                if (saved) {
                    var position = JSON.parse(saved);
                    this.setButtonPosition(position.corner);
                    console.log('📍 Button position restored:', position.corner);
                } else {
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
        },

        // ========================================
        // UTILIDADES
        // ========================================

        // Mostrar notificaciones globales
        showNotification: function (message, type = 'info', duration = 3000) {
            const colors = {
                success: '#27ae60',
                error: '#e74c3c',
                info: '#3498db',
                warning: '#f39c12'
            };

            const notification = $(`
                <div class="cm-notification" style="background: ${colors[type]};">
                    ${message}
                </div>
            `);

            $('body').append(notification);

            // Animar entrada
            setTimeout(() => {
                notification.css('transform', 'translateX(0)');
            }, 100);

            // Auto-remover
            setTimeout(() => {
                notification.css('transform', 'translateX(100%)');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        },

        // Escape HTML
        escapeHtml: function (text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Auto-inicializar cuando DOM esté listo
    $(document).ready(function () {
        ConsoleMonitor.init();
    });

    // Hacer disponible globalmente
    window.CM = window.ConsoleMonitor;

    console.log('📦 Console Monitor Core module loaded');

})(jQuery);