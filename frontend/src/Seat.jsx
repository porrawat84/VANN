function Seat({ goBack, goNext }) {
  return (
    <div style={{ padding: 40 }}>
      <h1>Seat Page</h1>

      <button onClick={goBack}>
        ← Back
      </button>

      <button onClick={goNext} style={{ marginLeft: 10 }}>
        Next →
      </button>
    </div>
  );
}

export default Seat;
