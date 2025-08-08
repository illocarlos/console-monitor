/**
 * Console Monitor Pro - JavaScript NOTAS
 * assets/js/cm-notes.js  
 * Sistema completo: notas originales + notas básicas agregadas
 */

(function ($) {
    'use strict';

    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // ========================================
    // SISTEMA ORIGINAL DE NOTAS (MANTENIDO)
    // ========================================

    // Extender estado para notas originales
    $.extend(window.ConsoleMonitor.state, {
        notesData: [],
        isAddingNote: false,
        markerMode: false,
        pendingNoteText: null,
        pageMarkers: new Map()
    });

    // Extender elementos DOM para notas originales
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null
    });

    // ========================================
    // SISTEMA NUEVO DE NOTAS BÁSICAS
    // ========================================

    // Estado para notas básicas
    window.ConsoleMonitor.simpleNotes = {
        data: [],
        isVisible: false
    };

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesModule();
        this.initSimpleNotesModule(); // NUEVO
    };

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
    };

    // Inicialización notas originales
    window.ConsoleMonitor.initNotesModule = function () {
        this.bindNotesEvents();
        console.log('📝 Original Notes System initialized');
    };

    // NUEVO: Inicialización notas básicas
    window.ConsoleMonitor.initSimpleNotesModule = function () {
        this.bindSimpleNotesEvents();
        this.loadSimpleNotesCount(); // Cargar contador al inicio
        console.log('📝 Simple Notes System initialized');
    };

    // ========================================
    // EVENTOS DEL SISTEMA ORIGINAL (MANTENIDOS)
    // ========================================

    window.ConsoleMonitor.bindNotesEvents = function () {
        const self = this;

        // Panel abierto - sistema original
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => {
                    // Aquí iría la carga de notas originales
                    console.log('📝 Original notes panel opened');
                }, 100);
            }
        });

        // Botón nueva nota - sistema original
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            console.log('📝 Original note creation - not implemented yet');
            alert('Sistema de notas avanzadas - En desarrollo');
        });

        // Otros eventos del sistema original...
    };

    // ========================================
    // EVENTOS DEL SISTEMA BÁSICO (NUEVO)
    // ========================================

    window.ConsoleMonitor.bindSimpleNotesEvents = function () {
        const self = this;

        // Toggle panel de notas básicas
        $(document).on('click', '.cm-simple-toggle-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const $widget = $('.cm-simple-notes-widget');
            if ($widget.is(':visible')) {
                $widget.hide();
                self.simpleNotes.isVisible = false;
            } else {
                $widget.show();
                self.simpleNotes.isVisible = true;
                self.loadSimpleNotes();
            }
        });

        // Cerrar panel de notas básicas
        $(document).on('click', '.cm-simple-btn-close', function (e) {
            e.preventDefault();
            $('.cm-simple-notes-widget').hide();
            self.simpleNotes.isVisible = false;
        });

        // Agregar nota básica
        $(document).on('click', '.cm-simple-btn-add', function (e) {
            e.preventDefault();

            const text = $('.cm-simple-note-input').val().trim();
            if (!text) {
                alert('Por favor escribe una nota');
                $('.cm-simple-note-input').focus();
                return;
            }

            self.saveSimpleNote(text);
        });

        // Enter para agregar nota básica
        $(document).on('keypress', '.cm-simple-note-input', function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                $('.cm-simple-btn-add').click();
            }
        });

        // Eliminar nota básica
        $(document).on('click', '.cm-simple-note-delete', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!confirm('¿Eliminar esta nota?')) return;

            const noteId = $(this).data('note-id');
            if (noteId) {
                self.deleteSimpleNote(noteId);
            }
        });

        // Cerrar al hacer click fuera
        $(document).on('click', function (e) {
            if (self.simpleNotes.isVisible &&
                !$(e.target).closest('.cm-simple-notes-widget, .cm-simple-toggle-btn').length) {
                $('.cm-simple-notes-widget').hide();
                self.simpleNotes.isVisible = false;
            }
        });

        // ESC para cerrar
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27 && self.simpleNotes.isVisible) { // ESC
                $('.cm-simple-notes-widget').hide();
                self.simpleNotes.isVisible = false;
            }
        });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA BÁSICO (NUEVO)
    // ========================================

    // Cargar notas básicas
    window.ConsoleMonitor.loadSimpleNotes = function () {
        const self = this;

        console.log('📝 Cargando notas básicas...');

        // Verificar que cmData esté disponible
        if (typeof cmData === 'undefined') {
            console.error('📝 cmData no disponible');
            alert('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📝 Respuesta notas básicas:', response);

                if (response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.renderSimpleNotes();
                    self.updateSimpleNotesCount();
                } else {
                    console.error('📝 Error en respuesta:', response.data);
                    alert('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error:', { xhr, status, error });
                alert('Error de conexión al cargar notas');
            });
    };

    // Guardar nota básica
    window.ConsoleMonitor.saveSimpleNote = function (text) {
        const self = this;

        console.log('📝 Guardando nota básica:', text);

        $.post(cmData.ajax_url, {
            action: 'cm_save_simple_note',
            nonce: cmData.nonce,
            note_text: text
        })
            .done(function (response) {
                console.log('📝 Nota básica guardada:', response);

                if (response.success) {
                    // Limpiar input
                    $('.cm-simple-note-input').val('');

                    // Recargar lista
                    self.loadSimpleNotes();

                    // Mostrar éxito brevemente
                    const $btn = $('.cm-simple-btn-add');
                    const originalText = $btn.text();
                    $btn.text('✅ Guardada').prop('disabled', true);
                    setTimeout(() => {
                        $btn.text(originalText).prop('disabled', false);
                    }, 1000);

                } else {
                    console.error('📝 Error guardando:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error guardando:', { xhr, status, error });
                alert('Error de conexión al guardar');
            });
    };

    // Eliminar nota básica
    window.ConsoleMonitor.deleteSimpleNote = function (noteId) {
        const self = this;

        console.log('🗑️ Eliminando nota básica:', noteId);

        $.post(cmData.ajax_url, {
            action: 'cm_delete_simple_note',
            nonce: cmData.nonce,
            note_id: noteId
        })
            .done(function (response) {
                console.log('🗑️ Respuesta eliminar:', response);

                if (response.success) {
                    // Recargar lista
                    self.loadSimpleNotes();
                } else {
                    console.error('🗑️ Error eliminando:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('🗑️ AJAX Error eliminando:', { xhr, status, error });
                alert('Error de conexión al eliminar');
            });
    };

    // Renderizar lista de notas básicas
    window.ConsoleMonitor.renderSimpleNotes = function () {
        const $list = $('.cm-simple-notes-list');

        if (!$list.length) {
            console.warn('📝 Lista de notas básicas no encontrada');
            return;
        }

        console.log('📝 Renderizando', this.simpleNotes.data.length, 'notas básicas');

        if (this.simpleNotes.data.length === 0) {
            $list.html(`
                <div class="cm-simple-notes-empty">
                    <div style="font-size: 32px; margin-bottom: 10px;">📝</div>
                    <div style="font-weight: bold; margin-bottom: 5px;">No hay notas aún</div>
                    <div style="font-size: 11px; opacity: 0.8;">Escribe tu primera nota arriba</div>
                </div>
            `);
            return;
        }

        const html = this.simpleNotes.data.map(note => `
            <div class="cm-simple-note-item">
                <div class="cm-simple-note-text">${this.escapeHtml(note.text)}</div>
                <button class="cm-simple-note-delete" data-note-id="${note.id}" title="Eliminar">🗑</button>
            </div>
        `).join('');

        $list.html(html);
    };

    // Actualizar contador de notas básicas
    window.ConsoleMonitor.updateSimpleNotesCount = function () {
        const count = this.simpleNotes.data.length;
        const $counter = $('.cm-simple-notes-count');

        if (count > 0) {
            $counter.text(count).show();
        } else {
            $counter.hide();
        }

        console.log('📝 Contador actualizado:', count);
    };

    // Cargar solo el contador (para mostrar en el botón)
    window.ConsoleMonitor.loadSimpleNotesCount = function () {
        const self = this;

        // Solo cargar contador, no toda la interfaz
        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                if (response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.updateSimpleNotesCount();
                }
            })
            .fail(function () {
                console.log('📝 Error cargando contador (silenciado)');
            });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA ORIGINAL (STUBS)
    // ========================================

    // Placeholder para sistema original
    window.ConsoleMonitor.loadNotesFromWordPress = function () {
        console.log('📝 Sistema original de notas - pendiente de implementar');
        const $container = this.elements.$notesContainer;
        if ($container.length) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📝</div>
                    <div class="cm-notes-empty-title">Sistema avanzado en desarrollo</div>
                    <div class="cm-notes-empty-text">
                        Usa las "Notas Rápidas" del botón verde mientras tanto
                    </div>
                </div>
            `);
        }
    };

    // ========================================
    // UTILIDADES
    // ========================================

    window.ConsoleMonitor.escapeHtml = function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ========================================
    // FUNCIONES DE TESTING
    // ========================================

    // Test sistema básico
    window.testSimpleNotes = function () {
        console.log('🧪 Testing simple notes system');

        // Verificar elementos
        const $btn = $('.cm-simple-toggle-btn');
        const $widget = $('.cm-simple-notes-widget');

        console.log('🧪 Elementos encontrados:', {
            button: $btn.length,
            widget: $widget.length,
            cmData: typeof cmData !== 'undefined'
        });

        if ($btn.length === 0) {
            console.error('❌ Botón de notas básicas no encontrado');
            return;
        }

        // Abrir panel
        $btn.click();

        setTimeout(() => {
            // Agregar nota de prueba
            const testText = 'Nota de prueba ' + Date.now();
            $('.cm-simple-note-input').val(testText);
            $('.cm-simple-btn-add').click();

            console.log('🧪 Nota de prueba creada:', testText);
        }, 500);
    };

    // Test carga manual
    window.loadSimpleNotesTest = function () {
        console.log('🧪 Testing manual load');
        if (window.ConsoleMonitor && window.ConsoleMonitor.loadSimpleNotes) {
            window.ConsoleMonitor.loadSimpleNotes();
        } else {
            console.error('❌ loadSimpleNotes no disponible');
        }
    };

    // Verificar configuración
    window.checkSimpleNotesConfig = function () {
        console.log('🔧 Verificando configuración de notas básicas');

        const checks = {
            'jQuery': typeof jQuery !== 'undefined',
            'ConsoleMonitor': typeof window.ConsoleMonitor !== 'undefined',
            'cmData': typeof cmData !== 'undefined',
            'AJAX URL': typeof cmData !== 'undefined' && cmData.ajax_url,
            'Nonce': typeof cmData !== 'undefined' && cmData.nonce,
            'Botón presente': $('.cm-simple-toggle-btn').length > 0,
            'Widget presente': $('.cm-simple-notes-widget').length > 0
        };

        console.table(checks);

        let allGood = true;
        for (let check in checks) {
            if (!checks[check]) {
                console.error('❌', check);
                allGood = false;
            } else {
                console.log('✅', check);
            }
        }

        if (allGood) {
            console.log('🎉 ¡Configuración correcta!');
        } else {
            console.error('❌ Hay problemas en la configuración');
        }

        return checks;
    };

    // Auto-verificación al cargar
    setTimeout(function () {
        if (typeof window.ConsoleMonitor !== 'undefined') {
            console.log('📝 Notes System loaded successfully!');
            console.log('🧪 Comandos disponibles:');
            console.log('- testSimpleNotes() : Test notas básicas');
            console.log('- loadSimpleNotesTest() : Cargar notas manualmente');
            console.log('- checkSimpleNotesConfig() : Verificar configuración');
        }
    }, 2000);

    console.log('📝 Console Monitor Notes module loaded');

})(jQuery);