import { Link } from 'react-router-dom';
import { usePlants } from '../../hooks/usePlants';

export function PlantGrid() {
  const { plants, loading, error } = usePlants();

  if (loading) return <p>Loading plants...</p>;
  if (error) return <p>Error: {error}</p>;

  if (plants.length === 0) {
    return (
      <div>
        <h2>No plants yet</h2>
        <p>Add your first plant to get started.</p>
      </div>
    );
  }

  // Group by room
  const rooms = new Map<string, typeof plants>();
  for (const plant of plants) {
    const room = plant.room || 'Unassigned';
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(plant);
  }

  return (
    <div>
      <h2>Plants ({plants.length})</h2>
      {[...rooms.entries()].map(([room, roomPlants]) => (
        <div key={room} style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#666', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            {room}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {roomPlants.map((plant) => (
              <Link
                key={plant.id}
                to={`/plants/${plant.id}`}
                style={{
                  textDecoration: 'none', color: 'inherit',
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: 16,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <h3 style={{ margin: 0, fontSize: 16 }}>{plant.name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{plant.species}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
