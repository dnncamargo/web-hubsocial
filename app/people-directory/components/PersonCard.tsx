'use client';

import { useNavigate } from 'react-router';
import { Person } from '../../utils/interfaces';
import { Heart, Mail, Pencil, Phone } from 'lucide-react';
import styles from './PersonCard.module.css';

/**
 * @interface PersonCardProps
 * @description Props para o componente `PersonCard`, que exibe informações resumidas de uma pessoa e oferece ações de edição e favoritar.
 * @property {Person} person - O objeto da pessoa a ser exibido no cartão.
 * @property {(person: Person) => void} onEditPerson - Função chamada ao solicitar a edição da pessoa. Recebe o objeto da pessoa como argumento.
 * @property {(personId: string, currentValue: boolean) => void} onToggleFavorite - Função chamada ao solicitar a alteração do status de favorito da pessoa. Recebe o ID da pessoa e o valor atual do status como argumentos.
 */
interface PersonCardProps {
  person: Person;
  onEditPerson: (person: Person) => void;
  onToggleFavorite: (personId: string, currentValue: boolean) => void;
}

/**
 * @component
 * @description Componente para exibir um cartão resumido de uma pessoa, incluindo nome, telefone, email (opcional), ação de favoritar e botão de editar. Ao clicar no cartão, navega para a página de detalhes da pessoa.
 * @param {PersonCardProps} { person, onEditPerson, onToggleFavorite } - Props para o componente.
 * @returns {JSX.Element} Um cartão representando as informações da pessoa.
 */
const PersonCard = ({ person, onEditPerson, onToggleFavorite }: PersonCardProps) => {
  const navigate = useNavigate();
  const relationships = person.relationships ?? [];

  return (
    <article className={styles.card}>

      <div className={styles.header}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => navigate(`/people-directory/${person.id}`)}
        >
          <span className={styles.title}>{person.name}</span>
        </button>
        <div className={styles.actionGroup}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(person.id, !!person.favorite);
          }}
          aria-label={person.favorite ? `Remover ${person.name} dos favoritos` : `Adicionar ${person.name} aos favoritos`}
          className={`${styles.iconButton} ${person.favorite ? styles.favoriteActive : ''}`}>
          {person.favorite ? (
            <Heart className={styles.icon} fill="currentColor" />
          ) : (
            <Heart className={styles.icon} />
          )}
        </button>
        </div>
      </div>

      <button
        type="button"
        className={styles.bodyButton}
        aria-label={`Abrir detalhes de ${person.name}`}
        onClick={() => navigate(`/people-directory/${person.id}`)}
      >
      <div className={styles.body}>
        <div className={styles.metaList}>
        {person.phone && (
          <div className={styles.metaRow}>
            <Phone className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.phone}</span>
          </div>
        )}
        {person.email && (
          <div className={styles.metaRow}>
            <Mail className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.email}</span>
          </div>
        )}
        </div>

        {relationships.length > 0 && (
          <div className={styles.relationships}>
              {relationships.map((rel) => (
                <span
                  key={rel}
                  className={styles.relationship}
                >
                  {rel}
                </span>
              ))}
          </div>
        )}
      </div>
      </button>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.editButton}
          onClick={(e) => {
            e.stopPropagation();
            onEditPerson(person);
          }}
        >
          <Pencil className={styles.icon} aria-hidden="true" />
          Editar
        </button>
      </div>
    </article>
  );
};

export default PersonCard;
