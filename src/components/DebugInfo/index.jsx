import React from 'react';

const DebugInfo = ({ debugData }) => {
  if (!debugData) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h2>Debug Information</h2>
      <pre style={styles.pre}>{JSON.stringify(debugData, null, 2)}</pre>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 9999,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  pre: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
};

export default DebugInfo;
