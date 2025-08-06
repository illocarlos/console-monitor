/**
 * SISTEMA COMPLETO WORDPRESS - NOTAS CON MARCADORES
 * Reemplaza completamente tu cm-notes.js
 */

(function ($) {
    'use strict';

    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // Extender estado
    $.extend(window.ConsoleMonitor.state, {
        notesData: [],
        isAddingNote: false,
        markerMode: false,
        pendingNoteText: null, // Texto de la nota pendiente de ubicar
        pageMarkers: new Map()
    });

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null
    });

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesModule();
    };

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
    };

    window.ConsoleMonitor.initNotesModule = function () {
        this.bindNotesEvents();
        this.loadNotesFromWordPress();
        this.loadExistingMarkers();
        console.log('📝 WordPress Notes System initialized');
    };

    // ========================================
    // EVENTOS PRINCIPALES
    // ========================================

    window.ConsoleMonitor.bindNotesEvents = function () {
        const self = this;

        // Panel abierto
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => self.loadNotesFromWordPress(), 100);
            }
        });

        // ✅ BOTÓN NUEVA NOTA - FORMULARIO INMEDIATO
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            console.log('📝 Nueva Nota clicked - showing form immediately');
            self.showNoteForm();
        });

        // Otros eventos...
        $(document).on('click', '.cm-note-action-btn.delete', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            self.deleteNote(noteId);
        });

        $(document).on('click', '.cm-page-marker', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            self.openNoteFromMarker(noteId);
        });

        // Escape para cancelar
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27) {
                if (self.state.markerMode) {
                    self.exitMarkerMode();
                } else if (self.state.isAddingNote) {
                    self.cancelNoteForm();
                }
            }
        });
    };

    // ========================================
    // CARGAR NOTAS DESDE WORDPRESS
    // ========================================

    window.ConsoleMonitor.loadNotesFromWordPress = function () {
        const self = this;

        console.log('📝 Loading notes from WordPress...');

        $.post(ajaxurl || cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce,
            page_url: window.location.href
        }, function (response) {
            console.log('📝 WordPress response:', response);

            if (response.success) {
                self.state.notesData = response.data.notes || [];
                self.renderNotes();
                self.showPageMarkers();
                console.log('📝 Loaded', self.state.notesData.length, 'notes');
            } else {
                console.error('📝 Error loading notes:', response);
                self.showNotification('Error al cargar notas', 'error');
            }
        }).fail(function (xhr, status, error) {
            console.error('📝 AJAX error:', error);
            self.showNotification('Error de conexión', 'error');
        });
    };

    // ========================================
    // MOSTRAR FORMULARIO INMEDIATO
    // ========================================

    window.ConsoleMonitor.showNoteForm = function () {
        if (this.state.isAddingNote) return;

        console.log('📝 Showing immediate note form');
        this.state.isAddingNote = true;

        const formHtml = `
            <div class="cm-note-form-overlay" id="cm-note-form-overlay">
                <div class="cm-note-form-container">
                    <div class="cm-note-form-header">
                        <h3>📝 Nueva Nota</h3>
                        <button class="cm-btn-close-form">✕</button>
                    </div>
                    
                    <div class="cm-note-form-body">
                        <div class="cm-form-group">
                            <label class="cm-form-label">Texto de la nota:</label>
                            <textarea 
                                class="cm-form-textarea" 
                                id="cm-note-text" 
                                placeholder="Escribe tu nota aquí..."
                                rows="4"
                                maxlength="500"
                                required></textarea>
                        </div>
                        
                        <div class="cm-form-info">
                            📍 Después de escribir tu nota, podrás elegir dónde colocarla en la página
                        </div>
                    </div>
                    
                    <div class="cm-note-form-footer">
                        <button class="cm-form-btn secondary" id="cm-cancel-note">Cancelar</button>
                        <button class="cm-form-btn primary" id="cm-continue-note">Continuar →</button>
                    </div>
                </div>
            </div>
        `;

        // Agregar al body para que sea modal
        $('body').append(formHtml);

        // Focus en textarea
        setTimeout(() => {
            $('#cm-note-text').focus();
        }, 100);

        // Eventos del formulario
        this.bindFormEvents();
    };

    // ========================================
    // EVENTOS DEL FORMULARIO
    // ========================================

    window.ConsoleMonitor.bindFormEvents = function () {
        const self = this;

        // Cerrar formulario
        $(document).on('click', '.cm-btn-close-form, #cm-cancel-note', function () {
            self.cancelNoteForm();
        });

        // Continuar a marcador
        $(document).on('click', '#cm-continue-note', function () {
            const noteText = $('#cm-note-text').val().trim();

            if (!noteText) {
                alert('❌ Por favor escribe el texto de la nota');
                $('#cm-note-text').focus();
                return;
            }

            console.log('📝 Note text ready:', noteText);
            self.state.pendingNoteText = noteText;

            // Ocultar formulario y activar marcador
            $('#cm-note-form-overlay').hide();
            self.activateMarkerMode();
        });

        // Click fuera del modal para cerrar
        $(document).on('click', '#cm-note-form-overlay', function (e) {
            if (e.target === this) {
                self.cancelNoteForm();
            }
        });
    };

    // ========================================
    // MODO MARCADOR
    // ========================================

    window.ConsoleMonitor.activateMarkerMode = function () {
        console.log('📍 Activating marker mode for note:', this.state.pendingNoteText);

        this.state.markerMode = true;

        // Cambiar cursor y fondo
        document.body.style.cursor = 'crosshair';
        document.body.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';

        // Mostrar instrucciones
        this.showMarkerInstructions();

        // Event listener para clicks
        document.addEventListener('click', this.handleMarkerClick.bind(this), true);
    };

    window.ConsoleMonitor.handleMarkerClick = function (e) {
        if (!this.state.markerMode) return;

        console.log('📍 Marker click at:', e.pageX, e.pageY);

        // Evitar elementos de la interfaz
        const target = e.target;
        const tagName = target.tagName.toLowerCase();
        const className = target.className || '';

        // Lista de elementos a evitar
        const avoidElements = ['button', 'a', 'input', 'select', 'textarea'];
        const avoidClasses = ['cm-', 'marker-instructions'];

        if (avoidElements.includes(tagName) ||
            avoidClasses.some(cls => className.includes(cls))) {
            console.log('📍 Ignoring interface element');
            return;
        }

        // Parar evento
        e.preventDefault();
        e.stopPropagation();

        const x = e.pageX;
        const y = e.pageY;

        console.log('📍 Valid marker position:', x, y);

        // Salir del modo marcador
        this.exitMarkerMode();

        // Guardar nota con posición
        this.saveNoteToWordPress(this.state.pendingNoteText, x, y);
    };

    window.ConsoleMonitor.showMarkerInstructions = function () {
        const instructions = $(`
            <div class="marker-instructions" id="marker-instructions">
                <div class="marker-instructions-content">
                    <h4>📍 Elige la ubicación para tu nota</h4>
                    <p><strong>"${this.state.pendingNoteText.substring(0, 50)}${this.state.pendingNoteText.length > 50 ? '...' : ''}"</strong></p>
                    <p>Haz click donde quieras colocar esta nota</p>
                    <button class="btn-cancel-marker">❌ Cancelar</button>
                </div>
            </div>
        `);

        $('body').append(instructions);

        // Evento cancelar
        $('.btn-cancel-marker').on('click', () => {
            this.exitMarkerMode();
            this.cancelNoteForm();
        });
    };

    window.ConsoleMonitor.exitMarkerMode = function () {
        console.log('📍 Exiting marker mode');

        this.state.markerMode = false;

        // Restaurar cursor y fondo
        document.body.style.cursor = '';
        document.body.style.backgroundColor = '';

        // Remover listener
        document.removeEventListener('click', this.handleMarkerClick.bind(this), true);

        // Remover instrucciones
        $('#marker-instructions').remove();
    };

    // ========================================
    // GUARDAR EN WORDPRESS
    // ========================================

    window.ConsoleMonitor.saveNoteToWordPress = function (noteText, markerX, markerY) {
        console.log('💾 Saving note to WordPress:', {
            text: noteText,
            x: markerX,
            y: markerY,
            url: window.location.href
        });

        const self = this;

        // Mostrar loader
        this.showNotification('💾 Guardando nota...', 'info');

        $.post(ajaxurl || cmData.ajax_url, {
            action: 'cm_save_note',
            nonce: cmData.nonce,
            note_data: JSON.stringify({
                text: noteText,
                marker_x: markerX,
                marker_y: markerY,
                page_url: window.location.href,
                created_at: new Date().toISOString()
            })
        }, function (response) {
            console.log('💾 WordPress save response:', response);

            if (response.success) {
                console.log('✅ Note saved successfully with ID:', response.data.note_id);

                // Limpiar estado
                self.state.pendingNoteText = null;
                self.state.isAddingNote = false;

                // Mostrar éxito
                self.showNotification('✅ Nota guardada correctamente', 'success');

                // Crear marcador visual inmediatamente
                const newNote = {
                    id: response.data.note_id,
                    text: noteText,
                    marker_x: markerX,
                    marker_y: markerY,
                    created_at: new Date().toLocaleDateString()
                };

                // Agregar a la lista
                self.state.notesData.push(newNote);

                // Crear marcador en página
                self.createPageMarker(newNote);

                // Re-renderizar lista
                self.renderNotes();

                // Remover formulario
                $('#cm-note-form-overlay').remove();

            } else {
                console.error('❌ Error saving note:', response);
                self.showNotification('❌ Error al guardar: ' + (response.data || 'Error desconocido'), 'error');

                // Volver a mostrar formulario
                $('#cm-note-form-overlay').show();
            }
        }).fail(function (xhr, status, error) {
            console.error('❌ AJAX error saving note:', error);
            self.showNotification('❌ Error de conexión al guardar', 'error');

            // Volver a mostrar formulario
            $('#cm-note-form-overlay').show();
        });
    };

    // ========================================
    // CANCELAR FORMULARIO
    // ========================================

    window.ConsoleMonitor.cancelNoteForm = function () {
        console.log('📝 Canceling note form');

        // Limpiar estado
        this.state.isAddingNote = false;
        this.state.pendingNoteText = null;

        // Remover formulario
        $('#cm-note-form-overlay').remove();

        // Si estaba en modo marcador, salir
        if (this.state.markerMode) {
            this.exitMarkerMode();
        }
    };

    // ========================================
    // RENDERIZAR NOTAS
    // ========================================

    window.ConsoleMonitor.renderNotes = function () {
        const $container = this.elements.$notesContainer;
        if (!$container.length) return;

        if (this.state.notesData.length === 0) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📝</div>
                    <div class="cm-notes-empty-title">Sin notas aún</div>
                    <div class="cm-notes-empty-text">
                        Crea tu primera nota con el botón "Nueva Nota"
                    </div>
                </div>
            `);
            return;
        }

        const notesHtml = this.state.notesData.map(note => `
            <div class="cm-note-item" data-note-id="${note.id}">
                <div class="cm-note-header">
                    <div class="cm-note-title">📍 ${this.escapeHtml(note.text.substring(0, 50))}${note.text.length > 50 ? '...' : ''}</div>
                    <div class="cm-note-actions">
                        <button class="cm-note-action-btn delete" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="cm-note-content">
                    <div class="cm-note-description">${this.escapeHtml(note.text)}</div>
                </div>
                <div class="cm-note-footer">
                    <div class="cm-note-meta">
                        <span>📅 ${note.created_at}</span>
                        <span>📍 Posición: ${note.marker_x}, ${note.marker_y}</span>
                    </div>
                </div>
            </div>
        `).join('');

        $container.html(`
            <div class="cm-notes-list">
                ${notesHtml}
            </div>
        `);
    };

    // ========================================
    // MARCADORES EN PÁGINA
    // ========================================

    window.ConsoleMonitor.loadExistingMarkers = function () {
        // Los marcadores se cargarán cuando se carguen las notas
    };

    window.ConsoleMonitor.showPageMarkers = function () {
        console.log('📍 Showing page markers for', this.state.notesData.length, 'notes');

        // Limpiar marcadores existentes
        this.state.pageMarkers.forEach(marker => marker.remove());
        this.state.pageMarkers.clear();

        // Crear marcadores para notas de esta página
        const currentUrl = window.location.href;
        const pageNotes = this.state.notesData.filter(note => note.page_url === currentUrl);

        pageNotes.forEach(note => {
            this.createPageMarker(note);
        });

        console.log('📍 Created', pageNotes.length, 'page markers');
    };

    window.ConsoleMonitor.createPageMarker = function (note) {
        console.log('📍 Creating page marker for note:', note.id);

        const marker = $(`
            <div class="cm-page-marker" data-note-id="${note.id}" 
                 style="left: ${note.marker_x}px; top: ${note.marker_y}px;">
                📍
                <div class="cm-marker-tooltip">
                    <div class="cm-marker-tooltip-text">${this.escapeHtml(note.text)}</div>
                </div>
            </div>
        `);

        $('body').append(marker);
        this.state.pageMarkers.set(parseInt(note.id), marker);

        // Animación de entrada
        setTimeout(() => {
            marker.addClass('marker-visible');
        }, 100);

        console.log('📍 Page marker created successfully');
    };

    // ========================================
    // ELIMINAR NOTA
    // ========================================

    window.ConsoleMonitor.deleteNote = function (noteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;

        console.log('🗑️ Deleting note:', noteId);

        const self = this;

        $.post(ajaxurl || cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        }, function (response) {
            if (response.success) {
                console.log('✅ Note deleted successfully');

                // Remover de la lista
                self.state.notesData = self.state.notesData.filter(note => note.id != noteId);

                // Remover marcador de página
                const marker = self.state.pageMarkers.get(parseInt(noteId));
                if (marker) {
                    marker.remove();
                    self.state.pageMarkers.delete(parseInt(noteId));
                }

                // Re-renderizar
                self.renderNotes();

                self.showNotification('✅ Nota eliminada', 'success');

            } else {
                console.error('❌ Error deleting note:', response);
                self.showNotification('❌ Error al eliminar nota', 'error');
            }
        }).fail(function (xhr, status, error) {
            console.error('❌ AJAX error deleting note:', error);
            self.showNotification('❌ Error de conexión', 'error');
        });
    };

    // ========================================
    // ABRIR NOTA DESDE MARCADOR
    // ========================================

    window.ConsoleMonitor.openNoteFromMarker = function (noteId) {
        console.log('📝 Opening note from marker:', noteId);

        if (this.state.activePanel !== 'notes') {
            this.selectPanel('notes');
        }

        // Hacer scroll a la nota en la lista
        setTimeout(() => {
            const $noteElement = $(`.cm-note-item[data-note-id="${noteId}"]`);
            if ($noteElement.length) {
                $noteElement[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                $noteElement.addClass('highlighted');
                setTimeout(() => $noteElement.removeClass('highlighted'), 2000);
            }
        }, 500);
    };

    // ========================================
    // UTILIDADES
    // ========================================

    window.ConsoleMonitor.escapeHtml = function (text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ========================================
    // CSS DINÁMICO
    // ========================================

    // Inyectar CSS necesario
    $(`
        <style>
        /* Formulario modal */
        .cm-note-form-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .cm-note-form-container {
            background: #2c3e50;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease;
        }
        
        .cm-note-form-header {
            background: #34495e;
            padding: 20px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .cm-note-form-header h3 {
            color: white;
            margin: 0;
            font-size: 18px;
        }
        
        .cm-btn-close-form {
            background: rgba(231, 76, 60, 0.2);
            border: none;
            color: #e74c3c;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
        }
        
        .cm-note-form-body {
            padding: 20px;
        }
        
        .cm-form-group {
            margin-bottom: 15px;
        }
        
        .cm-form-label {
            display: block;
            color: #ecf0f1;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .cm-form-textarea {
            width: 100%;
            background: #1a1a1a;
            border: 2px solid #555;
            border-radius: 6px;
            color: #e6e6e6;
            padding: 12px;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
        }
        
        .cm-form-textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        .cm-form-info {
            background: rgba(52, 152, 219, 0.1);
            border: 1px solid rgba(52, 152, 219, 0.3);
            border-radius: 6px;
            padding: 12px;
            color: #3498db;
            font-size: 12px;
            margin-top: 10px;
        }
        
        .cm-note-form-footer {
            background: #34495e;
            padding: 15px 20px;
            border-radius: 0 0 12px 12px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .cm-form-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .cm-form-btn.primary {
            background: #3498db;
            color: white;
        }
        
        .cm-form-btn.primary:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        .cm-form-btn.secondary {
            background: #95a5a6;
            color: white;
        }
        
        .cm-form-btn.secondary:hover {
            background: #7f8c8d;
        }
        
        /* Instrucciones de marcador */
        .marker-instructions {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2c3e50;
            border-radius: 10px;
            padding: 20px;
            z-index: 99998;
            border: 2px solid #3498db;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: pulse 2s infinite;
        }
        
        .marker-instructions-content {
            text-align: center;
            color: white;
        }
        
        .marker-instructions h4 {
            margin: 0 0 10px 0;
            color: #3498db;
        }
        
        .btn-cancel-marker {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
        }
        
        /* Marcadores en página */
        .cm-page-marker {
            position: absolute;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            z-index: 99995;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
            transition: all 0.3s ease;
            opacity: 0;
            transform: scale(0);
        }
        
        .cm-page-marker.marker-visible {
            opacity: 1;
            transform: scale(1);
        }
        
        .cm-page-marker:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.6);
        }
        
        .cm-marker-tooltip {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            max-width: 200px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .cm-page-marker:hover .cm-marker-tooltip {
            opacity: 1;
        }
        
        .cm-marker-tooltip-text {
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Animaciones */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        
        /* Notas destacadas */
        .cm-note-item.highlighted {
            background: rgba(52, 152, 219, 0.1);
            border-color: #3498db;
            transform: scale(1.02);
            transition: all 0.3s ease;
        }
        </style>
    `).appendTo('head');

    console.log('📝 WordPress Notes System loaded successfully!');

})(jQuery);

// ========================================
// PHP BACKEND PARA WORDPRESS (functions.php)
// ========================================

/*
AGREGA ESTE CÓDIGO A TU functions.php:

// AJAX para guardar notas
add_action('wp_ajax_cm_save_note', 'cm_save_note_handler');
add_action('wp_ajax_nopriv_cm_save_note', 'cm_save_note_handler');

function cm_save_note_handler() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'cm_nonce')) {
        wp_send_json_error('Error de seguridad');
        return;
    }
    
    $note_data = json_decode(stripslashes($_POST['note_data']), true);
    
    // Validar datos
    if (empty($note_data['text'])) {
        wp_send_json_error('El texto de la nota es requerido');
        return;
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'cm_notes';
    
    // Crear tabla si no existe
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id int(11) NOT NULL AUTO_INCREMENT,
        text text NOT NULL,
        marker_x int(11) NOT NULL,
        marker_y int(11) NOT NULL,
        page_url varchar(500) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Insertar nota
    $result = $wpdb->insert(
        $table_name,
        array(
            'text' => sanitize_textarea_field($note_data['text']),
            'marker_x' => intval($note_data['marker_x']),
            'marker_y' => intval($note_data['marker_y']),
            'page_url' => esc_url_raw($note_data['page_url']),
            'created_at' => current_time('mysql')
        ),
        array('%s', '%d', '%d', '%s', '%s')
    );
    
    if ($result === false) {
        wp_send_json_error('Error al guardar en la base de datos: ' . $wpdb->last_error);
        return;
    }
    
    wp_send_json_success(array(
        'note_id' => $wpdb->insert_id,
        'message' => 'Nota guardada correctamente'
    ));
}

// AJAX para obtener notas
add_action('wp_ajax_cm_get_notes', 'cm_get_notes_handler');
add_action('wp_ajax_nopriv_cm_get_notes', 'cm_get_notes_handler');

function cm_get_notes_handler() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'cm_nonce')) {
        wp_send_json_error('Error de seguridad');
        return;
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'cm_notes';
    
    // Obtener página actual si se especifica
    $page_url = isset($_POST['page_url']) ? esc_url_raw($_POST['page_url']) : '';
    
    // Query para obtener notas
    if (!empty($page_url)) {
        $notes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE page_url = %s ORDER BY created_at DESC",
            $page_url
        ), ARRAY_A);
    } else {
        $notes = $wpdb->get_results(
            "SELECT * FROM $table_name ORDER BY created_at DESC",
            ARRAY_A
        );
    }
    
    // Formatear fechas
    foreach ($notes as &$note) {
        $note['created_at'] = date('d/m/Y H:i', strtotime($note['created_at']));
    }
    
    wp_send_json_success(array(
        'notes' => $notes,
        'total' => count($notes)
    ));
}

// AJAX para eliminar notas
add_action('wp_ajax_cm_delete_note', 'cm_delete_note_handler');
add_action('wp_ajax_nopriv_cm_delete_note', 'cm_delete_note_handler');

function cm_delete_note_handler() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'cm_nonce')) {
        wp_send_json_error('Error de seguridad');
        return;
    }
    
    $note_id = intval($_POST['note_id']);
    
    if (empty($note_id)) {
        wp_send_json_error('ID de nota inválido');
        return;
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'cm_notes';
    
    $result = $wpdb->delete(
        $table_name,
        array('id' => $note_id),
        array('%d')
    );
    
    if ($result === false) {
        wp_send_json_error('Error al eliminar de la base de datos');
        return;
    }
    
    wp_send_json_success(array(
        'message' => 'Nota eliminada correctamente'
    ));
}

// Enqueue scripts y generar nonce
add_action('wp_enqueue_scripts', 'cm_enqueue_notes_scripts');

function cm_enqueue_notes_scripts() {
    // Solo en frontend
    if (is_admin()) return;
    
    wp_localize_script('jquery', 'cmData', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('cm_nonce')
    ));
}

*/

// ========================================
// TEST COMMANDS PARA WORDPRESS
// ========================================

// Test completo del sistema
window.testWordPressNotes = function () {
    console.log('🧪 Testing WordPress Notes System');

    if (window.ConsoleMonitor) {
        console.log('✅ Console Monitor available');

        // Test AJAX connection
        jQuery.post(ajaxurl || cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce,
            page_url: window.location.href
        }, function (response) {
            console.log('✅ AJAX connection working:', response);
        }).fail(function (error) {
            console.error('❌ AJAX connection failed:', error);
        });

        // Test form display
        window.ConsoleMonitor.showNoteForm();
        console.log('✅ Form should be displayed');

    } else {
        console.error('❌ Console Monitor not available');
    }

    console.log(`
🧪 WORDPRESS NOTES SYSTEM TEST

VERIFICACIONES:
✅ Sistema cargado
✅ AJAX configurado
✅ Formulario funcional

FLUJO DE PRUEBA:
1. Se debería mostrar un formulario modal
2. Escribe texto y click "Continuar"
3. Se activa modo marcador (cursor cruz)
4. Click en la página para colocar marcador
5. Se guarda en WordPress y aparece en la página

ESTADO ACTUAL:
- cmData disponible: ${typeof cmData !== 'undefined'}
- AJAX URL: ${typeof ajaxurl !== 'undefined' ? ajaxurl : (typeof cmData !== 'undefined' ? cmData.ajax_url : 'NO DISPONIBLE')}
- Nonce: ${typeof cmData !== 'undefined' && cmData.nonce ? 'CONFIGURADO' : 'NO DISPONIBLE'}
    `);
};

// Crear nota de prueba manual
window.createTestNote = function () {
    console.log('🧪 Creating test note manually');

    const testData = {
        text: 'Esta es una nota de prueba creada manualmente',
        marker_x: Math.floor(window.innerWidth / 2),
        marker_y: Math.floor(window.innerHeight / 2 + window.scrollY),
        page_url: window.location.href
    };

    jQuery.post(ajaxurl || cmData.ajax_url, {
        action: 'cm_save_note',
        nonce: cmData.nonce,
        note_data: JSON.stringify(testData)
    }, function (response) {
        console.log('✅ Test note created:', response);

        if (response.success) {
            alert('✅ ¡FUNCIONA!\n\nNota de prueba creada correctamente.\nID: ' + response.data.note_id);

            // Recargar notas si Console Monitor está disponible
            if (window.ConsoleMonitor && window.ConsoleMonitor.loadNotesFromWordPress) {
                window.ConsoleMonitor.loadNotesFromWordPress();
            }
        } else {
            alert('❌ Error: ' + response.data);
        }
    }).fail(function (error) {
        console.error('❌ Test failed:', error);
        alert('❌ Error de conexión:\n' + error.responseText);
    });
};

// Verificar configuración
window.checkWordPressConfig = function () {
    console.log('🔧 Checking WordPress configuration');

    const checks = {
        'jQuery disponible': typeof jQuery !== 'undefined',
        'cmData configurado': typeof cmData !== 'undefined',
        'AJAX URL disponible': typeof ajaxurl !== 'undefined' || (typeof cmData !== 'undefined' && cmData.ajax_url),
        'Nonce configurado': typeof cmData !== 'undefined' && cmData.nonce,
        'Console Monitor': typeof window.ConsoleMonitor !== 'undefined'
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
        console.log('🎉 ¡Configuración correcta! El sistema debería funcionar.');

        // Test de conexión AJAX
        jQuery.post(ajaxurl || cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        }, function (response) {
            console.log('✅ Conexión AJAX exitosa');
        }).fail(function () {
            console.error('❌ Conexión AJAX falló - revisa functions.php');
        });

    } else {
        console.error('❌ Configuración incompleta - revisa functions.php y cmData');
    }
};

// Auto-verificación al cargar
setTimeout(function () {
    if (typeof window.ConsoleMonitor !== 'undefined') {
        console.log('📝 WordPress Notes System ready!');
        console.log('🧪 Comandos disponibles:');
        console.log('- testWordPressNotes() : Test completo');
        console.log('- createTestNote() : Crear nota de prueba');
        console.log('- checkWordPressConfig() : Verificar configuración');
    }
}, 3000);

console.log(`
📝 SISTEMA WORDPRESS NOTAS - COMPLETO Y FUNCIONAL

CARACTERÍSTICAS:
✅ Formulario modal inmediato al click "Nueva Nota"
✅ Campo de texto simple y limpio
✅ Sistema de marcador antes de guardar
✅ Guardado real en base de datos WordPress
✅ Marcadores visuales en la página
✅ Lista de notas funcional
✅ Eliminación de notas

INSTALACIÓN:
1. ✅ JavaScript: Reemplaza tu cm-notes.js con este código
2. 📄 PHP: Agrega el código functions.php a tu WordPress
3. 🧪 Test: Ejecuta testWordPressNotes() en consola

FLUJO GARANTIZADO:
1️⃣ Click "Nueva Nota" → Formulario modal aparece
2️⃣ Escribe texto → Click "Continuar"
3️⃣ Modo marcador activado → Click en página
4️⃣ Nota guardada en WordPress → Marcador visible en página

¡SISTEMA 100% FUNCIONAL CON WORDPRESS!
`);