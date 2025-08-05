/**
 * Console Monitor Pro - JavaScript SOLO PARA NOTAS Y MARCADORES
 * Archivo: assets/js/console-monitor-notes.js
 * Se incluye DESPUÉS del archivo principal console-monitor-simple.js
 */

(function ($) {
    'use strict';

    // Verificar que ConsoleMonitor existe
    if (!window.ConsoleMonitor) {
        console.error('Console Monitor Notes: ConsoleMonitor no está disponible');
        return;
    }

    // EXTENDER EL OBJETO ConsoleMonitor EXISTENTE
    $.extend(window.ConsoleMonitor.state, {
        // Estados de notas
        notesData: [],
        isAddingNote: false,
        selectedNoteForMarker: null,
        pageMarkers: new Map(), // noteId -> markerElement
        markerMode: false
    });

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null
    });

    // ========================================
    // EXTENDER FUNCIONES PRINCIPALES
    // ========================================

    // Agregar al init existente
    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesSystem();
    };

    // Agregar al cacheElements existente
    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
    };

    // Agregar a bindEvents existente
    const originalBindEvents = window.ConsoleMonitor.bindEvents;
    window.ConsoleMonitor.bindEvents = function () {
        originalBindEvents.call(this);
        this.bindNotesEvents();
    };

    // Modificar closeActivePanel para incluir notas
    const originalCloseActivePanel = window.ConsoleMonitor.closeActivePanel;
    window.ConsoleMonitor.closeActivePanel = function () {
        const self = this;

        if (!this.state.activePanel) return;

        this.elements.$overlay.removeClass('show');
        this.elements.$terminal.removeClass('show');
        this.elements.$iphone.removeClass('show');
        this.elements.$notes.removeClass('show'); // NUEVO

        setTimeout(function () {
            self.elements.$container.removeClass('terminal-active iphone-active notes-active'); // AGREGADO notes-active
            self.elements.$btn.find('.cm-btn-icon').text('🔧');
            self.elements.$btn.find('.cm-btn-text').text('Debug');
            self.state.activePanel = null;
            self.state.isExpanded = false;
        }, 500);
    };

    // ========================================
    // FUNCIONES PRINCIPALES DE NOTAS
    // ========================================

    // Inicializar sistema de notas
    window.ConsoleMonitor.initNotesSystem = function () {
        this.loadNotesFromDB();
        this.setupPageMarkers();
        console.log('📝 Notes system initialized');
    };

    // Eventos específicos de notas
    window.ConsoleMonitor.bindNotesEvents = function () {
        const self = this;

        // Click en botón de notas
        $(document).on('click', '.cm-option-btn.notes', function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.selectNotes();
        });

        // Botón agregar nota
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            self.showAddNoteForm();
        });

        // Formulario de nueva nota
        $(document).on('click', '.cm-form-btn.primary', function (e) {
            e.preventDefault();
            self.submitNoteForm();
        });

        $(document).on('click', '.cm-form-btn.secondary', function (e) {
            e.preventDefault();
            self.cancelNoteForm();
        });

        // Acciones de notas
        $(document).on('click', '.cm-note-action-btn.marker', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            self.toggleNoteMarker(noteId);
        });

        $(document).on('click', '.cm-note-action-btn.delete', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            self.deleteNote(noteId);
        });

        // Checklist interactions
        $(document).on('click', '.cm-checklist-checkbox', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            const itemIndex = $(this).closest('.cm-checklist-item').index();
            self.toggleChecklistItem(noteId, itemIndex);
        });

        // Click en marcador de página
        $(document).on('click', '.cm-page-marker', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            self.openNoteFromMarker(noteId);
        });

        // Atajos de teclado para notas
        $(document).on('keydown', function (e) {
            // Ctrl+Shift+N para abrir notas
            if (e.ctrlKey && e.shiftKey && e.keyCode === 78) {
                e.preventDefault();
                self.selectNotes();
            }
        });
    };

    // Seleccionar panel de notas
    window.ConsoleMonitor.selectNotes = function () {
        if (this.state.isTransforming) return;

        this.state.isTransforming = true;
        this.state.activePanel = 'notes';

        this.elements.$container.removeClass('expanded').addClass('transforming-notes');

        this.elements.$btn.find('.cm-btn-icon').text('📝');
        this.elements.$btn.find('.cm-btn-text').text('Notas');

        const self = this;
        setTimeout(function () {
            self.elements.$container.removeClass('transforming-notes').addClass('notes-active');
            self.elements.$overlay.addClass('show');
            self.elements.$notes.addClass('show');
            self.loadNotesFromDB();
            self.state.isTransforming = false;
            self.state.isExpanded = false;
        }, 800);
    };

    // ========================================
    // GESTIÓN DE NOTAS
    // ========================================

    // Cargar notas desde la base de datos
    window.ConsoleMonitor.loadNotesFromDB = function () {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        }, function (response) {
            if (response.success) {
                self.state.notesData = response.data.notes || [];
                self.renderNotes();
                self.updatePageMarkers();
            }
        });
    };

    // Renderizar notas
    window.ConsoleMonitor.renderNotes = function () {
        const $container = this.elements.$notesContainer;

        if (this.state.notesData.length === 0) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📝</div>
                    <div class="cm-notes-empty-title">Sin notas aún</div>
                    <div class="cm-notes-empty-text">
                        Crea tu primera nota para empezar a organizar<br>
                        tu debugging y tareas de desarrollo
                    </div>
                </div>
            `);
            return;
        }

        const notesHtml = this.state.notesData.map(note => this.renderNoteItem(note)).join('');
        $container.html(notesHtml);

        // Actualizar contador
        $('.cm-notes-count').text(`${this.state.notesData.length} notas`);
    };

    // Renderizar una nota individual
    window.ConsoleMonitor.renderNoteItem = function (note) {
        const hasMarker = note.marker_x && note.marker_y;
        const completedTasks = note.checklist.filter(item => item.completed).length;
        const totalTasks = note.checklist.length;

        return `
            <div class="cm-note-item ${hasMarker ? 'has-marker' : ''}" data-note-id="${note.id}">
                <div class="cm-note-header">
                    <div class="cm-note-title">${this.escapeHtml(note.title)}</div>
                    <div class="cm-note-actions">
                        <button class="cm-note-action-btn marker ${hasMarker ? 'active' : ''}" 
                                title="Crear/Quitar marcador">📍</button>
                        <button class="cm-note-action-btn delete" title="Eliminar nota">🗑️</button>
                    </div>
                </div>
                <div class="cm-note-content">
                    ${note.description ? `<div class="cm-note-description">${this.escapeHtml(note.description)}</div>` : ''}
                    ${note.checklist.length > 0 ? this.renderChecklist(note.checklist, note.id) : ''}
                </div>
                <div class="cm-note-footer">
                    <div class="cm-note-meta">
                        <span>📅 ${note.created_at}</span>
                        ${totalTasks > 0 ? `<span>✅ ${completedTasks}/${totalTasks} tareas</span>` : ''}
                    </div>
                    ${hasMarker ? '<div class="cm-note-marker-info">📍 Con marcador</div>' : ''}
                </div>
            </div>
        `;
    };

    // Renderizar checklist
    window.ConsoleMonitor.renderChecklist = function (checklist, noteId) {
        const checklistHtml = checklist.map((item, index) => `
            <div class="cm-checklist-item ${item.completed ? 'completed' : ''}" data-item-index="${index}">
                <div class="cm-checklist-checkbox ${item.completed ? 'checked' : ''}"></div>
                <div class="cm-checklist-text">${this.escapeHtml(item.text)}</div>
            </div>
        `).join('');

        return `<ul class="cm-note-checklist">${checklistHtml}</ul>`;
    };

    // Mostrar formulario de nueva nota
    window.ConsoleMonitor.showAddNoteForm = function () {
        if (this.state.isAddingNote) return;

        this.state.isAddingNote = true;

        const formHtml = `
            <div class="cm-note-form" id="cm-note-form">
                <div class="cm-form-group">
                    <label class="cm-form-label">Título de la nota</label>
                    <input type="text" class="cm-form-input" id="cm-note-title" 
                           placeholder="Ej: Revisar header responsivo" maxlength="100">
                </div>
                <div class="cm-form-group">
                    <label class="cm-form-label">Descripción (opcional)</label>
                    <textarea class="cm-form-textarea" id="cm-note-description" 
                              placeholder="Contexto adicional sobre esta nota..." maxlength="500"></textarea>
                </div>
                <div class="cm-form-group">
                    <label class="cm-form-label">Checklist (una tarea por línea)</label>
                    <textarea class="cm-form-textarea" id="cm-note-checklist" 
                              placeholder="Verificar en mobile&#10;Probar en Safari&#10;Validar CSS Grid" 
                              rows="4" maxlength="1000"></textarea>
                </div>
                <div class="cm-form-actions">
                    <button class="cm-form-btn secondary">Cancelar</button>
                    <button class="cm-form-btn primary">Crear Nota</button>
                </div>
            </div>
        `;

        this.elements.$notesContainer.prepend(formHtml);
        $('#cm-note-title').focus();
    };

    // Enviar formulario de nota
    window.ConsoleMonitor.submitNoteForm = function () {
        const title = $('#cm-note-title').val().trim();
        const description = $('#cm-note-description').val().trim();
        const checklistText = $('#cm-note-checklist').val().trim();

        if (!title) {
            $('#cm-note-title').focus();
            this.showNotification('El título es requerido', 'error');
            return;
        }

        // Procesar checklist
        const checklist = checklistText ?
            checklistText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(text => ({ text, completed: false })) : [];

        const noteData = {
            title,
            description,
            checklist,
            url: window.location.href
        };

        this.saveNoteToDB(noteData);
    };

    // Cancelar formulario
    window.ConsoleMonitor.cancelNoteForm = function () {
        $('#cm-note-form').remove();
        this.state.isAddingNote = false;
    };

    // Guardar nota en BD
    window.ConsoleMonitor.saveNoteToDB = function (noteData) {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_save_note',
            nonce: cmData.nonce,
            note_data: JSON.stringify(noteData)
        }, function (response) {
            if (response.success) {
                self.cancelNoteForm();
                self.loadNotesFromDB();
                self.showNotification('Nota creada exitosamente', 'success');
            } else {
                self.showNotification('Error al crear la nota', 'error');
            }
        });
    };

    // Toggle checklist item
    window.ConsoleMonitor.toggleChecklistItem = function (noteId, itemIndex) {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_toggle_checklist_item',
            nonce: cmData.nonce,
            note_id: noteId,
            item_index: itemIndex
        }, function (response) {
            if (response.success) {
                self.loadNotesFromDB();
            }
        });
    };

    // Eliminar nota
    window.ConsoleMonitor.deleteNote = function (noteId) {
        if (!confirm('¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer.')) {
            return;
        }

        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        }, function (response) {
            if (response.success) {
                self.removePageMarker(noteId);
                self.loadNotesFromDB();
                self.showNotification('Nota eliminada', 'success');
            }
        });
    };

    // ========================================
    // SISTEMA DE MARCADORES
    // ========================================

    // Setup inicial de marcadores
    window.ConsoleMonitor.setupPageMarkers = function () {
        const self = this;

        // Interceptar clicks para crear marcadores
        $(document).on('click', function (e) {
            if (self.state.markerMode && self.state.selectedNoteForMarker) {
                e.preventDefault();
                e.stopPropagation();

                const x = e.pageX;
                const y = e.pageY;

                self.createMarkerAtPosition(self.state.selectedNoteForMarker, x, y);
                self.exitMarkerMode();
            }
        });
    };

    // Toggle marcador de nota
    window.ConsoleMonitor.toggleNoteMarker = function (noteId) {
        const note = this.state.notesData.find(n => n.id == noteId);
        if (!note) return;

        if (note.marker_x && note.marker_y) {
            // Quitar marcador existente
            this.removeMarkerFromDB(noteId);
        } else {
            // Crear nuevo marcador
            this.enterMarkerMode(noteId);
        }
    };

    // Entrar en modo marcador
    window.ConsoleMonitor.enterMarkerMode = function (noteId) {
        this.state.markerMode = true;
        this.state.selectedNoteForMarker = noteId;

        // Cambiar cursor y mostrar instrucciones
        $('body').css('cursor', 'crosshair');
        this.showNotification('Haz click en la página donde quieres colocar el marcador', 'info', 5000);

        // Overlay sutil para indicar modo activo
        $('body').append('<div id="cm-marker-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(243, 156, 18, 0.1); z-index: 99994; pointer-events: none;"></div>');
    };

    // Salir del modo marcador
    window.ConsoleMonitor.exitMarkerMode = function () {
        this.state.markerMode = false;
        this.state.selectedNoteForMarker = null;
        $('body').css('cursor', '');
        $('#cm-marker-overlay').remove();
    };

    // Crear marcador en posición
    window.ConsoleMonitor.createMarkerAtPosition = function (noteId, x, y) {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_save_marker',
            nonce: cmData.nonce,
            note_id: noteId,
            marker_x: x,
            marker_y: y,
            page_url: window.location.href
        }, function (response) {
            if (response.success) {
                self.loadNotesFromDB();
                self.showNotification('Marcador creado exitosamente', 'success');
            }
        });
    };

    // Actualizar marcadores en la página
    window.ConsoleMonitor.updatePageMarkers = function () {
        // Limpiar marcadores existentes
        $('.cm-page-marker').remove();
        this.state.pageMarkers.clear();

        // Crear marcadores para la página actual
        const currentUrl = window.location.href;
        this.state.notesData.forEach(note => {
            if (note.marker_x && note.marker_y && note.page_url === currentUrl) {
                this.createMarkerElement(note);
            }
        });
    };

    // Crear elemento marcador
    window.ConsoleMonitor.createMarkerElement = function (note) {
        const markerElement = $(`
            <div class="cm-page-marker" data-note-id="${note.id}" style="left: ${note.marker_x}px; top: ${note.marker_y}px;">
                📍
                <div class="cm-marker-tooltip">${this.escapeHtml(note.title)}</div>
            </div>
        `);

        $('body').append(markerElement);
        this.state.pageMarkers.set(note.id, markerElement);
    };

    // Abrir nota desde marcador
    window.ConsoleMonitor.openNoteFromMarker = function (noteId) {
        // Si el panel de notas no está abierto, abrirlo
        if (this.state.activePanel !== 'notes') {
            this.selectNotes();

            // Esperar a que se abra y luego hacer scroll a la nota
            setTimeout(() => {
                this.scrollToNote(noteId);
            }, 1000);
        } else {
            this.scrollToNote(noteId);
        }
    };

    // Scroll a nota específica
    window.ConsoleMonitor.scrollToNote = function (noteId) {
        const $noteElement = $(`.cm-note-item[data-note-id="${noteId}"]`);
        if ($noteElement.length) {
            // Highlight temporal
            $noteElement.css({
                'background': 'linear-gradient(90deg, rgba(39, 174, 96, 0.2) 0%, #252525 50%)',
                'transform': 'scale(1.02)'
            });

            // Scroll suave
            this.elements.$notesContainer.animate({
                scrollTop: $noteElement.offset().top - this.elements.$notesContainer.offset().top + this.elements.$notesContainer.scrollTop() - 20
            }, 500);

            // Quitar highlight después de 2 segundos
            setTimeout(() => {
                $noteElement.css({
                    'background': '',
                    'transform': ''
                });
            }, 2000);
        }
    };

    // Remover marcador de página
    window.ConsoleMonitor.removePageMarker = function (noteId) {
        const markerElement = this.state.pageMarkers.get(noteId);
        if (markerElement) {
            markerElement.remove();
            this.state.pageMarkers.delete(noteId);
        }
    };

    // Remover marcador de BD
    window.ConsoleMonitor.removeMarkerFromDB = function (noteId) {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_remove_marker',
            nonce: cmData.nonce,
            note_id: noteId
        }, function (response) {
            if (response.success) {
                self.removePageMarker(noteId);
                self.loadNotesFromDB();
                self.showNotification('Marcador eliminado', 'success');
            }
        });
    };

    // ========================================
    // UTILIDADES
    // ========================================

    // Mostrar notificaciones
    window.ConsoleMonitor.showNotification = function (message, type = 'info', duration = 3000) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        const notification = $(`
            <div class="cm-notification" style="
                background: ${colors[type]};
                color: white;
            ">${message}</div>
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
    };

    console.log('📝 Console Monitor Notes module loaded successfully');

})(jQuery);