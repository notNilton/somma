// Mock para arquivos SVG importados como componentes React
const React = require("react");

// Retorna um componente View simples em vez de "svg" para evitar problemas
// com react-test-renderer que pode não reconhecer "svg" como host component
module.exports = (props) => React.createElement("View", props);
module.exports.ReactComponent = (props) => React.createElement("View", props);
