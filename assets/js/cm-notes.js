/**
 * Console Monitor Pro - JavaScript NOTAS COMPLETO
 * assets/js/cm-notes.js  
 * Sistema completo: notas avanzadas (con modal) + notas básicas (widget)
 */

(function ($) {
    'use strict';

    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // ========================================
    // ESTADOS PARA AMBOS SISTEMAS
    // ========================================

    // Extender estado para notas avanzadas
    $.extend(window.ConsoleMonitor.state, {
        advancedNotes: [],
        currentEditingNote: null,
        isEditingNote: false
    });

    // Estado para notas básicas
    window.ConsoleMonitor.simpleNotes = {
        data: [],
        isVisible: false
    };

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null,
        $noteModal: null,
        $noteForm: null
    });

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesModule();
        this.initSimpleNotesModule();
    };

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
        this.elements.$noteModal = $('#cm-note-modal');
        this.elements.$noteForm = $('#cm-note-form');
    };

    // Inicialización notas avanzadas
    window.ConsoleMonitor.initNotesModule = function () {
        this.bindAdvancedNotesEvents();
        console.log('📝 Advanced Notes System initialized');
    };

    // Inicialización notas básicas
    window.ConsoleMonitor.initSimpleNotesModule = function () {
        this.bindSimpleNotesEvents();
        this.loadSimpleNotesCount();
        console.log('📝 Simple Notes System initialized');
    };

    // ========================================
    // EVENTOS DEL SISTEMA AVANZADO
    // ========================================

    window.ConsoleMonitor.bindAdvancedNotesEvents = function () {
        const self = this;

        // Panel abierto - cargar notas avanzadas
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => {
                    self.loadAdvancedNotes();
                }, 100);
            }
        });

        // Botón nueva nota avanzada
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            self.openNoteModal();
        });

        // Botón actualizar notas
        $(document).on('click', '.cm-btn-refresh-notes', function (e) {
            e.preventDefault();
            self.loadAdvancedNotes();
        });

        // Modal events
        $(document).on('click', '.cm-note-modal-close, .cm-btn-cancel', function (e) {
            e.preventDefault();
            self.closeNoteModal();
        });

        // Cerrar modal al hacer click fuera
        $(document).on('click', '#cm-note-modal', function (e) {
            if (e.target === this) {
                self.closeNoteModal();
            }
        });

        // Submit del formulario
        $(document).on('submit', '#cm-note-form', function (e) {
            e.preventDefault();
            self.saveAdvancedNote();
        });

        // Agregar item a checklist
        $(document).on('click', '.cm-checklist-add', function (e) {
            e.preventDefault();
            self.addChecklistItem($(this));
        });

        // Remover item de checklist
        $(document).on('click', '.cm-checklist-remove', function (e) {
            e.preventDefault();
            $(this).closest('.cm-checklist-item').remove();
        });

        // Enter en checklist input
        $(document).on('keypress', '.cm-checklist-input', function (e) {
            if (e.which === 13) { // Enter
                e.preventDefault();
                const $addBtn = $(this).siblings('.cm-checklist-add');
                if ($addBtn.length) {
                    $addBtn.click();
                }
            }
        });

        // Editar nota avanzada
        $(document).on('click', '.cm-advanced-note-edit', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            self.editAdvancedNote(noteId);
        });

        // Eliminar nota avanzada
        $(document).on('click', '.cm-advanced-note-delete', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            if (confirm('¿Estás seguro de que quieres eliminar esta nota avanzada?')) {
                self.deleteAdvancedNote(noteId);
            }
        });

        // ESC para cerrar modal
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27 && self.elements.$noteModal.is(':visible')) {
                self.closeNoteModal();
            }
        });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA AVANZADO
    // ========================================

    // Cargar notas avanzadas
    window.ConsoleMonitor.loadAdvancedNotes = function () {
        const self = this;

        console.log('📝 Cargando notas avanzadas...');

        if (typeof cmData === 'undefined') {
            console.error('📝 cmData no disponible para notas avanzadas');
            this.showAdvancedNotesError('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📝 Respuesta notas avanzadas:', response);

                if (response.success) {
                    self.state.advancedNotes = response.data.notes || [];
                    self.renderAdvancedNotes();
                    self.updateAdvancedNotesCount();
                } else {
                    console.error('📝 Error en respuesta avanzada:', response.data);
                    self.showAdvancedNotesError('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error notas avanzadas:', { xhr, status, error });
                self.showAdvancedNotesError('Error de conexión al cargar notas avanzadas');
            });
    };

    // Renderizar notas avanzadas
    window.ConsoleMonitor.renderAdvancedNotes = function () {
        const $container = this.elements.$notesContainer;

        if (!$container.length) {
            console.warn('📝 Contenedor de notas avanzadas no encontrado');
            return;
        }

        console.log('📝 Renderizando', this.state.advancedNotes.length, 'notas avanzadas');

        if (this.state.advancedNotes.length === 0) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📝</div>
                    <div class="cm-notes-empty-title">No hay notas avanzadas</div>
                    <div class="cm-notes-empty-text">
                        Crea tu primera nota con checklist y marcadores.<br>
                        Haz clic en "Nueva" para empezar.
                    </div>
                </div>
            `);
            return;
        }

        const html = this.state.advancedNotes.map(note => this.renderAdvancedNoteItem(note)).join('');
        $container.html(html);
    };

    // Renderizar item individual de nota avanzada
    window.ConsoleMonitor.renderAdvancedNoteItem = function (note) {
        const checklistHtml = (note.checklist && note.checklist.length > 0) ?
            `<ul class="cm-advanced-note-checklist">
                ${note.checklist.map(item => `
                    <li>
                        <input type="checkbox" ${item.checked ? 'checked' : ''}>
                        <span>${this.escapeHtml(item.text)}</span>
                    </li>
                `).join('')}
            </ul>` : '';

        const urlHtml = note.url ?
            `<a href="${note.url}" target="_blank" class="cm-advanced-note-url">🔗 ${note.url}</a>` : '';

        return `
            <div class="cm-advanced-note" data-note-id="${note.id}">
                <div class="cm-advanced-note-header">
                    <h4 class="cm-advanced-note-title">${this.escapeHtml(note.title)}</h4>
                    <div class="cm-advanced-note-actions">
                        <button class="cm-advanced-note-edit" data-note-id="${note.id}" title="Editar">✏️</button>
                        <button class="cm-advanced-note-delete" data-note-id="${note.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
                
                ${note.description ? `<div class="cm-advanced-note-description">${this.escapeHtml(note.description)}</div>` : ''}
                ${urlHtml}
                ${checklistHtml}
                
                <div class="cm-advanced-note-meta">
                    Creada: ${note.created_at} • Actualizada: ${note.updated_at}
                </div>
            </div>
        `;
    };

    // Abrir modal de nota
    window.ConsoleMonitor.openNoteModal = function (noteData = null) {
        this.state.isEditingNote = !!noteData;
        this.state.currentEditingNote = noteData;

        // Configurar título del modal
        const modalTitle = noteData ? 'Editar Nota' : 'Nueva Nota';
        $('#cm-note-modal-title').text(modalTitle);

        // Limpiar formulario
        this.elements.$noteForm[0].reset();
        $('#cm-checklist-container').html(`
            <div class="cm-checklist-item">
                <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                <button type="button" class="cm-checklist-add">➕</button>
            </div>
        `);

        // Si estamos editando, llenar con datos
        if (noteData) {
            $('#cm-note-title').val(noteData.title);
            $('#cm-note-description').val(noteData.description);
            $('#cm-note-url').val(noteData.url);

            // Llenar checklist
            if (noteData.checklist && noteData.checklist.length > 0) {
                const checklistHtml = noteData.checklist.map(item => `
                    <div class="cm-checklist-item">
                        <input type="text" value="${this.escapeHtml(item.text)}" class="cm-checklist-input" data-checked="${item.checked ? 'true' : 'false'}">
                        <button type="button" class="cm-checklist-remove">🗑️</button>
                    </div>
                `).join('') + `
                    <div class="cm-checklist-item">
                        <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                        <button type="button" class="cm-checklist-add">➕</button>
                    </div>
                `;
                $('#cm-checklist-container').html(checklistHtml);
            }
        }

        // Mostrar modal
        this.elements.$noteModal.fadeIn(300);
        $('#cm-note-title').focus();
    };

    // Cerrar modal de nota
    window.ConsoleMonitor.closeNoteModal = function () {
        this.elements.$noteModal.fadeOut(300);
        this.state.isEditingNote = false;
        this.state.currentEditingNote = null;
    };

    // Agregar item a checklist
    window.ConsoleMonitor.addChecklistItem = function ($button) {
        const $input = $button.siblings('.cm-checklist-input');
        const text = $input.val().trim();

        if (!text) {
            alert('Por favor escribe una tarea');
            $input.focus();
            return;
        }

        // Crear nuevo item
        const newItemHtml = `
            <div class="cm-checklist-item">
                <input type="text" value="${this.escapeHtml(text)}" class="cm-checklist-input" data-checked="false">
                <button type="button" class="cm-checklist-remove">🗑️</button>
            </div>
        `;

        // Insertar antes del item de "agregar"
        $button.closest('.cm-checklist-item').before(newItemHtml);

        // Limpiar input
        $input.val('').focus();
    };

    // Guardar nota avanzada
    window.ConsoleMonitor.saveAdvancedNote = function () {
        const self = this;

        // Recopilar datos del formulario
        const title = $('#cm-note-title').val().trim();
        const description = $('#cm-note-description').val().trim();
        const url = $('#cm-note-url').val().trim();

        if (!title) {
            alert('El título es requerido');
            $('#cm-note-title').focus();
            return;
        }

        // Recopilar checklist
        const checklist = [];
        $('#cm-checklist-container .cm-checklist-item').each(function () {
            const $input = $(this).find('.cm-checklist-input');
            const text = $input.val().trim();
            const checked = $input.data('checked') === 'true' || $input.data('checked') === true;

            if (text && !$(this).find('.cm-checklist-add').length) {
                checklist.push({
                    text: text,
                    checked: checked
                });
            }
        });

        // Preparar datos
        const noteData = {
            title: title,
            description: description,
            url: url,
            checklist: JSON.stringify(checklist)
        };

        // Si estamos editando, agregar ID
        if (this.state.isEditingNote && this.state.currentEditingNote) {
            noteData.note_id = this.state.currentEditingNote.id;
        }

        // Mostrar estado de carga
        const $saveBtn = $('.cm-btn-save');
        const originalText = $saveBtn.text();
        $saveBtn.text('Guardando...').prop('disabled', true);

        // Determinar acción
        const action = this.state.isEditingNote ? 'cm_update_note' : 'cm_save_note';

        // Enviar
        $.post(cmData.ajax_url, {
            action: action,
            nonce: cmData.nonce,
            ...noteData
        })
            .done(function (response) {
                console.log('📝 Nota avanzada guardada:', response);

                if (response.success) {
                    self.closeNoteModal();
                    self.loadAdvancedNotes(); // Recargar lista
                    self.showNotification(response.data.message || 'Nota guardada', 'success');
                } else {
                    console.error('📝 Error guardando nota avanzada:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error guardando nota avanzada:', { xhr, status, error });
                alert('Error de conexión al guardar nota avanzada');
            })
            .always(function () {
                $saveBtn.text(originalText).prop('disabled', false);
            });
    };

    // Editar nota avanzada
    window.ConsoleMonitor.editAdvancedNote = function (noteId) {
        const note = this.state.advancedNotes.find(n => n.id == noteId);
        if (!note) {
            alert('Nota no encontrada');
            return;
        }

        this.openNoteModal(note);
    };

    // Eliminar nota avanzada
    window.ConsoleMonitor.deleteAdvancedNote = function (noteId) {
        const self = this;

        console.log('🗑️ Eliminando nota avanzada:', noteId);

        $.post(cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        })
            .done(function (response) {
                console.log('🗑️ Respuesta eliminar nota avanzada:', response);

                if (response.success) {
                    self.loadAdvancedNotes(); // Recargar lista
                    self.showNotification(response.data.message || 'Nota eliminada', 'success');
                } else {
                    console.error('🗑️ Error eliminando nota avanzada:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('🗑️ AJAX Error eliminando nota avanzada:', { xhr, status, error });
                alert('Error de conexión al eliminar nota avanzada');
            });
    };

    // Actualizar contador de notas avanzadas
    window.ConsoleMonitor.updateAdvancedNotesCount = function () {
        const count = this.state.advancedNotes.length;
        $('#cm-notes .cm-notes-count').text(`${count} notas`);
        console.log('📝 Contador de notas avanzadas actualizado:', count);
    };

    // Mostrar error en notas avanzadas
    window.ConsoleMonitor.showAdvancedNotesError = function (message) {
        const $container = this.elements.$notesContainer;
        if ($container.length) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon" style="color: #e74c3c;">❌</div>
                    <div class="cm-notes-empty-title" style="color: #e74c3c;">Error</div>
                    <div class="cm-notes-empty-text">${message}</div>
                </div>
            `);
        }
    };

    // ========================================
    // EVENTOS DEL SISTEMA BÁSICO (RÁPIDO)
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

            if (!confirm('¿Eliminar esta nota rápida?')) return;

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

        // ESC para cerrar notas básicas
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27 && self.simpleNotes.isVisible) { // ESC
                $('.cm-simple-notes-widget').hide();
                self.simpleNotes.isVisible = false;
            }
        });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA BÁSICO
    // ========================================

    // Cargar notas básicas
    window.ConsoleMonitor.loadSimpleNotes = function () {
        const self = this;

        console.log('📝 Cargando notas básicas...');

        if (typeof cmData === 'undefined') {
            console.error('📝 cmData no disponible para notas básicas');
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
                    console.error('📝 Error en respuesta básica:', response.data);
                    alert('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error notas básicas:', { xhr, status, error });
                alert('Error de conexión al cargar notas básicas');
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
                    console.error('📝 Error guardando nota básica:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error guardando nota básica:', { xhr, status, error });
                alert('Error de conexión al guardar nota básica');
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
                console.log('🗑️ Respuesta eliminar nota básica:', response);

                if (response.success) {
                    // Recargar lista
                    self.loadSimpleNotes();
                } else {
                    console.error('🗑️ Error eliminando nota básica:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('🗑️ AJAX Error eliminando nota básica:', { xhr, status, error });
                alert('Error de conexión al eliminar nota básica');
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
                    <div style="font-weight: bold; margin-bottom: 5px;">No hay notas rápidas aún</div>
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

        console.log('📝 Contador de notas básicas actualizado:', count);
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
                console.log('📝 Error cargando contador básico (silenciado)');
            });
    };

    // ========================================
    // UTILIDADES COMPARTIDAS
    // ========================================

    window.ConsoleMonitor.escapeHtml = function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ========================================
    // FUNCIONES DE TESTING Y DEBUG
    // ========================================

    // Test sistema avanzado
    window.testAdvancedNotes = function () {
        console.log('🧪 Testing advanced notes system');

        const $btn = $('.cm-btn-add-note');
        const $panel = $('#cm-notes');

        console.log('🧪 Elementos encontrados:', {
            button: $btn.length,
            panel: $panel.length,
            cmData: typeof cmData !== 'undefined'
        });

        if ($btn.length === 0) {
            console.error('❌ Botón de notas avanzadas no encontrado');
            return;
        }

        // Abrir modal
        $btn.click();

        setTimeout(() => {
            // Llenar formulario de prueba
            $('#cm-note-title').val('Nota de prueba ' + Date.now());
            $('#cm-note-description').val('Descripción de prueba para notas avanzadas');
            $('#cm-note-url').val('https://ejemplo.com');

            console.log('🧪 Formulario de nota avanzada llenado');
        }, 500);
    };

    // Test sistema básico
    window.testSimpleNotes = function () {
        console.log('🧪 Testing simple notes system');

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
            const testText = 'Nota básica de prueba ' + Date.now();
            $('.cm-simple-note-input').val(testText);
            $('.cm-simple-btn-add').click();

            console.log('🧪 Nota básica de prueba creada:', testText);
        }, 500);
    };

    // Verificar configuración completa
    window.checkNotesConfig = function () {
        console.log('🔧 Verificando configuración completa de notas');

        const checks = {
            'jQuery': typeof jQuery !== 'undefined',
            'ConsoleMonitor': typeof window.ConsoleMonitor !== 'undefined',
            'cmData': typeof cmData !== 'undefined',
            'AJAX URL': typeof cmData !== 'undefined' && cmData.ajax_url,
            'Nonce': typeof cmData !== 'undefined' && cmData.nonce,

            // Sistema avanzado
            'Botón nueva nota avanzada': $('.cm-btn-add-note').length > 0,
            'Panel notas avanzadas': $('#cm-notes').length > 0,
            'Modal notas avanzadas': $('#cm-note-modal').length > 0,
            'Formulario avanzado': $('#cm-note-form').length > 0,

            // Sistema básico
            'Botón notas básicas': $('.cm-simple-toggle-btn').length > 0,
            'Widget notas básicas': $('.cm-simple-notes-widget').length > 0,
            'Lista notas básicas': $('.cm-simple-notes-list').length > 0
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
            console.log('🎉 ¡Configuración completa correcta!');
        } else {
            console.error('❌ Hay problemas en la configuración');
        }

        return checks;
    };

    // Auto-verificación al cargar
    setTimeout(function () {
        if (typeof window.ConsoleMonitor !== 'undefined') {
            console.log('📝 Notes System (Complete) loaded successfully!');
            console.log('🧪 Comandos disponibles:');
            console.log('- testAdvancedNotes() : Test notas avanzadas');
            console.log('- testSimpleNotes() : Test notas básicas');
            console.log('- checkNotesConfig() : Verificar configuración completa');
        }
    }, 2000);

    console.log('📝 Console Monitor Notes (Complete) module loaded');

})(jQuery);