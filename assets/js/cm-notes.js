/**
 * Console Monitor Pro - JavaScript NOTAS COMPLETO
 * assets/js/cm-notes.js
 * Sistema completo de notas con marcadores interactivos
 * Requiere: cm-core.js, jQuery
 */

(function ($) {
    'use strict';

    // Verificar dependencia
    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // Extender estado base
    $.extend(window.ConsoleMonitor.state, {
        // Estados específicos de notas
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
    // INICIALIZACIÓN DEL MÓDULO NOTAS
    // ========================================

    // Extender la función init del core
    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesModule();
    };

    // Extender cacheElements del core
    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
    };

    // Inicializar módulo de notas
    window.ConsoleMonitor.initNotesModule = function () {
        this.bindNotesEvents();
        this.setupPageMarkers();
        this.loadExistingMarkers();

        console.log('📝 Notes module initialized');
    };

    // ========================================
    // EVENTOS ESPECÍFICOS DE NOTAS
    // ========================================

    window.ConsoleMonitor.bindNotesEvents = function () {
        const self = this;

        // Escuchar apertura del panel de notas
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => {
                    self.loadNotesFromDB();
                }, 100);
            }
        });

        // Botón agregar nota
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            self.showAddNoteForm();
        });

        // Formulario de nueva nota
        $(document).on('click', '.cm-form-btn.primary', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-note-form').length) {
                self.submitNoteForm();
            }
        });

        $(document).on('click', '.cm-form-btn.secondary', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-note-form').length) {
                self.cancelNoteForm();
            }
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

        // NUEVO: Click en marcador de página
        $(document).on('click', '.cm-page-marker', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            self.openNoteFromMarker(noteId);
        });

        // NUEVO: Escape para salir del modo marcador
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27 && self.state.markerMode) {
                self.exitMarkerMode();
            }
        });
    };

    // ========================================
    // GESTIÓN DE NOTAS
    // ========================================

    // Cargar notas desde BD
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
                console.log('📝 Loaded', self.state.notesData.length, 'notes');
            } else {
                console.error('Error loading notes:', response);
                self.showNotification('Error al cargar notas', 'error');
            }
        }).fail(function (xhr, status, error) {
            console.error('AJAX error loading notes:', error);
            self.showNotification('Error de conexión', 'error');
        });
    };

    // Renderizar notas
    window.ConsoleMonitor.renderNotes = function () {
        const $container = this.elements.$notesContainer;

        if (!$container.length) {
            console.warn('Notes container not found');
            return;
        }

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
            $('.cm-notes-count').text('0 notas');
            return;
        }

        const notesHtml = this.state.notesData.map(note => this.renderNoteItem(note)).join('');
        $container.html(notesHtml);

        // Actualizar contador
        $('.cm-notes-count').text(`${this.state.notesData.length} notas`);
    };

    // Renderizar nota individual
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
                                title="${hasMarker ? 'Quitar marcador' : 'Crear marcador'}">📍</button>
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

    // Mostrar formulario nueva nota
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

    // Enviar formulario nota
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
                console.error('Error saving note:', response);
                self.showNotification('Error al crear la nota: ' + (response.data || 'desconocido'), 'error');
            }
        }).fail(function (xhr, status, error) {
            console.error('AJAX error saving note:', error);
            self.showNotification('Error de conexión al guardar', 'error');
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
            } else {
                self.showNotification('Error al actualizar checklist', 'error');
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
            } else {
                self.showNotification('Error al eliminar nota', 'error');
            }
        });
    };

    // ========================================
    // SISTEMA DE MARCADORES EN PÁGINA
    // ========================================

    // Setup inicial de marcadores
    window.ConsoleMonitor.setupPageMarkers = function () {
        const self = this;

        // NUEVO: Interceptar clicks para crear marcadores
        $(document).on('click', function (e) {
            if (self.state.markerMode && self.state.selectedNoteForMarker) {
                e.preventDefault();
                e.stopPropagation();

                // Obtener posición del click
                const x = e.pageX;
                const y = e.pageY;

                console.log('📍 Creating marker at:', x, y);
                self.createMarkerAtPosition(self.state.selectedNoteForMarker, x, y);
                self.exitMarkerMode();
            }
        });
    };

    // NUEVO: Cargar marcadores existentes en la página
    window.ConsoleMonitor.loadExistingMarkers = function () {
        // Cargar marcadores desde variable global creada por PHP
        if (window.cmPageMarkers && Array.isArray(window.cmPageMarkers)) {
            console.log('📍 Loading existing markers:', window.cmPageMarkers.length);
            window.cmPageMarkers.forEach(marker => {
                this.createMarkerElement({
                    id: marker.id,
                    title: marker.title,
                    marker_x: marker.marker_x,
                    marker_y: marker.marker_y,
                    page_url: window.location.href
                });
            });
        }
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

        const note = this.state.notesData.find(n => n.id == noteId);
        const noteTitle = note ? note.title : 'esta nota';

        // Cambiar cursor y mostrar instrucciones
        $('body').css('cursor', 'crosshair').addClass('cm-marker-mode');
        this.showNotification(`Haz click en la página para marcar "${noteTitle}"`, 'info', 5000);

        // Overlay sutil para indicar modo activo
        $('body').append(`
            <div id="cm-marker-overlay" style="
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: rgba(243, 156, 18, 0.1); 
                z-index: 99994; 
                pointer-events: none;
                backdrop-filter: blur(1px);
            "></div>
        `);

        console.log('📍 Entered marker mode for note:', noteId);
    };

    // Salir del modo marcador
    window.ConsoleMonitor.exitMarkerMode = function () {
        this.state.markerMode = false;
        this.state.selectedNoteForMarker = null;
        $('body').css('cursor', '').removeClass('cm-marker-mode');
        $('#cm-marker-overlay').remove();
        console.log('📍 Exited marker mode');
    };

    // Crear marcador en posición específica
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

                // Crear inmediatamente el marcador visual
                const note = self.state.notesData.find(n => n.id == noteId);
                if (note) {
                    note.marker_x = x;
                    note.marker_y = y;
                    note.page_url = window.location.href;
                    self.createMarkerElement(note);
                }
            } else {
                self.showNotification('Error al crear marcador', 'error');
                console.error('Error creating marker:', response);
            }
        }).fail(function (xhr, status, error) {
            console.error('AJAX error creating marker:', error);
            self.showNotification('Error de conexión', 'error');
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

        console.log('📍 Updated page markers, total:', this.state.pageMarkers.size);
    };

    // Crear elemento marcador visual
    window.ConsoleMonitor.createMarkerElement = function (note) {
        // Verificar que no exista ya
        if (this.state.pageMarkers.has(note.id)) {
            this.state.pageMarkers.get(note.id).remove();
        }

        const markerElement = $(`
            <div class="cm-page-marker creating" data-note-id="${note.id}" 
                 style="left: ${note.marker_x}px; top: ${note.marker_y}px;">
                📍
                <div class="cm-marker-tooltip">${this.escapeHtml(note.title)}</div>
            </div>
        `);

        $('body').append(markerElement);
        this.state.pageMarkers.set(note.id, markerElement);

        // Remover clase de animación después de la animación
        setTimeout(() => {
            markerElement.removeClass('creating');
        }, 800);

        console.log('📍 Created marker element for note:', note.id, 'at', note.marker_x, note.marker_y);
    };

    // Abrir nota desde marcador
    window.ConsoleMonitor.openNoteFromMarker = function (noteId) {
        console.log('📍 Opening note from marker:', noteId);

        // Si el panel de notas no está abierto, abrirlo
        if (this.state.activePanel !== 'notes') {
            this.selectPanel('notes');

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
            $noteElement.addClass('highlighted').css({
                'background': 'linear-gradient(90deg, rgba(39, 174, 96, 0.2) 0%, #252525 50%)',
                'transform': 'scale(1.02)',
                'border-color': '#27ae60'
            });

            // Scroll suave
            this.elements.$notesContainer.animate({
                scrollTop: $noteElement.offset().top - this.elements.$notesContainer.offset().top + this.elements.$notesContainer.scrollTop() - 20
            }, 500);

            // Quitar highlight después de 3 segundos
            setTimeout(() => {
                $noteElement.removeClass('highlighted').css({
                    'background': '',
                    'transform': '',
                    'border-color': ''
                });
            }, 3000);

            console.log('📍 Scrolled to note:', noteId);
        } else {
            console.warn('📍 Note element not found:', noteId);
        }
    };

    // Remover marcador de página
    window.ConsoleMonitor.removePageMarker = function (noteId) {
        const markerElement = this.state.pageMarkers.get(noteId);
        if (markerElement) {
            markerElement.remove();
            this.state.pageMarkers.delete(noteId);
            console.log('📍 Removed page marker for note:', noteId);
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
            } else {
                self.showNotification('Error al eliminar marcador', 'error');
            }
        });
    };

    // ========================================
    // FUNCIÓN ESPECÍFICA PARA PANEL DE NOTAS
    // ========================================

    // Función selectNotes específica (llamada desde el core)
    window.ConsoleMonitor.selectNotes = function () {
        console.log('📝 Notes panel selected');
        // La lógica de apertura ya está en el core selectPanel()
        // Aquí podemos agregar lógica específica de notas si es necesaria
    };

    console.log('📝 Console Monitor Notes module loaded successfully');

})(jQuery);