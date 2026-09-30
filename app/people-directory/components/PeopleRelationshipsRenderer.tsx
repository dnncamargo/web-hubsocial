import styles from './PersonCard.module.css';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';

type PeopleRelationshipsRendererProps = {
  selectedRelationships: string[];
  relationshipColors?: EntityColorMap;
};

export function PeopleRelationshipsRenderer({
  selectedRelationships,
  relationshipColors,
}: PeopleRelationshipsRendererProps) {
  if (selectedRelationships.length === 0) return null;

  return (
    <div className={styles.relationships}>
      {selectedRelationships.map((rel) => (
        <span
          key={rel}
          className={styles.relationship}
          style={getEntityColorStyle(getEntityColor(relationshipColors, rel))}
        >
          {rel}
        </span>
      ))}
    </div>
  );
}

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
