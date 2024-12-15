const BackButton = ({ onBack }) => (
    <button
      style={{
        position: 'absolute',
        top: '20px',
        left: '220px',
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '5px',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
      }}
      onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
      onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
      onClick={onBack}
    >
      Back to Universe
    </button>
  );
  
  export default BackButton;