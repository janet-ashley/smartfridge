const STATUS_COLORS = { ok: "#4CAF50", soon: "#FF9800", expired: "#FF5252" };

export default function Home({ foods }) {
  return (
    <div className="container">
      <h2>Mon Frigo</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {foods.map((item) => (
          <div className="card" key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{item.name}</span>
              <span style={{
                width: 10, height: 10, borderRadius: 5,
                background: STATUS_COLORS[item.status] || "#BDBDBD",
                display: "inline-block"
              }} />
            </div>

            <p style={{ color: "#757575" }}>
              {item.daysLeft} jours
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}