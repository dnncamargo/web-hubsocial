'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import { motion } from 'motion/react';
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import CalendarEventCreator from '../../components/ui/CalendarEventCreator'
import useEventDate from '../../hooks/useEventDate';
import { useEventForm } from '../../hooks/useEventForm';
import { useOptionalFields } from '../../hooks/useOptionalFields';
import { OptionalFieldModal } from '../../components/optional-fields/OptionalFieldModal';
import { OptionalFieldRenderer } from '../../components/optional-fields/OptionalFieldRenderer'
import { useAssociatePerson } from '@/app/hooks/useAssociatePerson';
import { AssociatePersonModal } from './AssociatePersonModal';
import { AssociatePersonRenderer } from './AssociatePersonRenderer';
import { AssociatedPeopleModal } from './AssociatedPeopleModal';
import { EventCategoriesModal } from './EventCategoriesModal';
import { useEventCategories } from '@/app/hooks/useEventCategories';
import { EventCategoriesRenderer } from './EventCategoriesRenderer';
import ActionPlanningControl from '../../components/actions/ActionPlanningControl';
import AutomationRulesEditor from '../../components/actions/AutomationRulesEditor';
import styles from './AddEventModal.module.css';

/**
 * @interface AddEventModalProps
 * @description Props para o componente `AddEventModal`.
 * @property {boolean} isOpen - Controla a visibilidade do modal.
 * @property {() => void} onClose - Função para fechar o modal.
 * @property {() => void} onAdded - Função chamada após um novo evento ser adicionado com sucesso.
 * @property {string | undefined} initialPersonId - ID inicial de uma pessoa para pré-selecionar no formulário de adicionar evento (opcional).
 */
interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  initialPersonId?: string;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAdded, initialPersonId }) => {
  const { uid } = useAuth(); /** @const {uid | null} uid - O usuário do Firebase autenticado. */
  const modalRef = useRef<HTMLDivElement>(null);  /** @ref {HTMLDivElement} modalRef - Referência ao elemento do modal para manipulação direta. */

  const [showMore, setShowMore] = useState(false);  /** @state {boolean} showMore - Controla a visibilidade de campos adicionais. */
  const [showOptionalFieldModal, setShowOptionalFieldModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false); /** @state {boolean} showAddPersonModal - Controla a visibilidade do modal de adicionar pessoa. */
  const [showPersonListModal, setShowPersonListModal] = useState(false); /** @state {boolean} showPersonListModal - Controla a visibilidade do modal de lista de pessoas. */
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true); /** @state {boolean} isDraggable - Controla se o modal pode ser arrastado verticalmente. */

  const effectiveUid = uid ?? '';

  const dateControl = useEventDate();

  const optionalFieldsControl = useOptionalFields({ context: "event" }); // Hook para gerenciar campos opcionais

  const {
    optionalFields,
    addOptionalField,
    removeOptionalField,
    updateOptionalField,
    updateLabel,
    resetOptionalFields
  } = optionalFieldsControl; // Hook para gerenciar campos opcionais

  const associatePersonControl = useAssociatePerson({ uid: effectiveUid });

  const {
    people,
    fetchPeople,
    associatedPersonIds: personIds,
    associatePerson,
    disassociatePerson,
  } = associatePersonControl; // Hook para gerenciar pessoas associadas

  const eventCategoriesControl = useEventCategories(); // Hook para gerenciar categorias de eventos

  const {
    availableCategories,
    selectedCategories,
    toggleCategory,
    handleAddCategory,
    clearSelectedCategories
  } = eventCategoriesControl; // Hook para gerenciar categorias de eventos

  const {
    title, setTitle,
    location, setLocation,
    actionPlanning, setActionPlanning,
    automation, setAutomation,
    error, setError,
    createEvent
  } = useEventForm({ uid: effectiveUid, initialPersonId, dateControl, optionalFieldsControl, associatePersonControl, eventCategoriesControl }); // Hook para gerenciar o formulário de evento

  useLayoutEffect(() => {
    adjustModalDraggable(); // Ajusta a propriedade de arrastar do modal com base na altura do conteúdo.
  }, [isOpen]);

  useEffect(() => {
    {/* Ações ao abrir ou fechar o modal */ }
    if (isOpen) {

      document.body.classList.add('overflow-hidden'); // Previne scroll da tela de fundo

    } else {
      // Se 'isOpen' for falso (modal fechado), remove a classe 'overflow-hidden' do body
      // para permitir o scroll novamente na tela de fundo.
      document.body.classList.remove('overflow-hidden'); // Libera scroll da tela de fundo
    }

    /**
     * @function cleanup
     * @description Função de limpeza executada quando o componente é desmontado ou as dependências mudam. Remove a classe 'overflow-hidden' do body.
     * @returns {void}
     */
    return (): void => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetOptionalFields(); // nova função no hook
    }
  }, [isOpen]);

  const handleOpenAssociatePerson = async () => {
    await fetchPeople();
    setShowAddPersonModal(true);
    /*     personIds.forEach(element => {
          console.log('Elemento associado:', element);
        }); */
  };

  /**
 * @async
 * @function handleSubmit
 * @description Salva as informações do formulário no Firestore.
 * @param {React.FormEvent} e - Objeto do evento de formulário.
 * @returns {Promise<void>}
 */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const success = await createEvent();
    if (success) {
      onAdded();
      onClose();
    }
  };

  function adjustModalDraggable() {
    {/* Conflito drag vs. scroll vertical */ }
    const modal = document.getElementById('add-event-modal');
    // Verifica se o modal é maior que a altura da tela e ajusta a propriedade 'isDraggable' do modal.
    if (modal && modal.scrollHeight > window.innerHeight) {
      // Se o conteúdo do modal for maior que a tela, desabilita a funcionalidade de arrastar (draggable).
      setIsDraggable(false);
    } else {
      // Caso contrário, habilita a funcionalidade de arrastar.
      setIsDraggable(true);
    }
  }

  if (!isOpen || !uid) return null;

  return (

    <ProtectedRoute>
      <motion.div
        // Framer-Motion
        id="add-event-modal"
        ref={modalRef}
        className={styles.modal}
        //drag={isDraggable ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(event, info) => {
          if (info.point.y > 400) onClose();
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={styles.handle} aria-hidden="true"></div>
        {/* Formulário */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.content}>
            {/* Topo do Modal de Inclusão de Evento */}
            <div className={styles.toolbar}>
              <button type="button" onClick={onClose} className={styles.toolbarButton}>
                Cancelar
              </button>
              <h3 className={styles.toolbarTitle}>
                Novo Evento
              </h3>
              <button
                type="submit"
                disabled={!!error}
                className={styles.toolbarButton}>
                Salvar
              </button>
            </div>

            {/* Título e Local */}

            <div className={styles.fieldGroup}>
              <input
                type="text"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.textInput}
              />
              <input
                type="text"
                placeholder="Local ou chamada de vídeo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={styles.textInput}
              />
            </div>

            {/* All-day e Data */}
            <div className={styles.dateGroup}>

              <CalendarEventCreator
                {...dateControl} />
            </div>

            <ActionPlanningControl
              planning={actionPlanning}
              onChange={setActionPlanning}
            />

            <AutomationRulesEditor
              uid={effectiveUid}
              value={automation}
              onChange={setAutomation}
            />

            {/* Switch Mostrar Mais */}
            <div className={styles.moreRow}>
              <span>Mostrar mais campos</span>
              <button
                type="button"
                role="switch"
                aria-checked={showMore}
                onClick={() => setShowMore(!showMore)}
                className={showMore ? `${styles.switch} ${styles.switchActive}` : styles.switch}
              >
                <span
                  className={showMore ? `${styles.switchThumb} ${styles.switchThumbActive}` : styles.switchThumb}
                  aria-hidden="true"
                />
              </button>
            </div>
            {/* Switch habilitado */}
            {showMore && (
              <div className={styles.moreContent}>

                {/* Pessoas Associadas   */}
                <AssociatePersonRenderer
                  personIds={personIds}
                  people={people}
                  onOpenPersonList={() => setShowPersonListModal(true)}
                />

                {/* Campos Personalizados Adicionados   */}
                {optionalFields.map((field) => (
                  <div key={field.id} >
                    <OptionalFieldRenderer
                      field={field}
                      onChange={(updatedValue) => {
                        updateOptionalField(field.id, { value: updatedValue })
                      }}
                      onLabelChange={(newLabel) => updateLabel(field.id, newLabel)}
                      onRemove={() => removeOptionalField(field.id)}
                    />
                  </div>
                ))}

                <EventCategoriesRenderer selectedCategories={selectedCategories} />

                {/* Modal de Campos Personalizados */}
                {showOptionalFieldModal && (
                  <OptionalFieldModal
                    context='event'
                    onAddOptionalField={addOptionalField}
                    onClose={() => setShowOptionalFieldModal(false)}
                  />
                )}

                {showCategoriesModal && (
                  <EventCategoriesModal
                    onClose={() => {
                      setShowCategoriesModal(false);
                    }}
                    availableCategories={availableCategories}
                    selectedCategories={selectedCategories}
                    toggleCategory={toggleCategory}
                    handleAddCategory={handleAddCategory}
                  />
                )}

                {showAddPersonModal && (
                  <AssociatePersonModal
                    onClose={() => setShowAddPersonModal(false)}
                    onAssociatePerson={associatePerson}
                    onDisassociatePerson={disassociatePerson}
                    associatedPersonIds={personIds}
                    people={people}
                  />
                )}

                {showPersonListModal && (
                  <AssociatedPeopleModal
                    personIds={personIds}
                    people={people}
                    onDisassociatePerson={disassociatePerson}
                    onClose={() => setShowPersonListModal(false)}
                  />
                )}

                <div className={styles.actions}>
                  {/* Associar Pessoa */}
                  <button
                    type="button"
                    onClick={handleOpenAssociatePerson}
                    className={styles.textAction}
                  >
                    + Associar Pessoa
                  </button>

                  {/* Adicionar Categoria */}
                  <button
                    type="button"
                    onClick={() => setShowCategoriesModal(true)}
                    className={styles.textAction}
                  >
                    + Adicionar Categoria
                  </button>

                  {/* Adicionar Campo Personalizado */}
                  <button
                    type="button"
                    onClick={() => setShowOptionalFieldModal(true)}
                    className={styles.textAction}
                  >
                    + Adicionar Campo Opcional
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className={styles.error}>{error}</p>
            )}
          </div>
        </form>

      </motion.div>

    </ProtectedRoute>
  );
};

export default AddEventModal;
