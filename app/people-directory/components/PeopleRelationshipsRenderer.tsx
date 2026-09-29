import styles from './PersonCard.module.css';

type PeopleRelationshipsRendererProps = {
  selectedRelationships: string[];
};

export function PeopleRelationshipsRenderer({
  selectedRelationships,
}: PeopleRelationshipsRendererProps) {
  if (selectedRelationships.length === 0) return null;

  return (
    <div className={styles.relationships}>
      {selectedRelationships.map((rel) => (
        <span
          key={rel}
          className={styles.relationship}
        >
          {rel}
        </span>
      ))}
    </div>
  );
}
