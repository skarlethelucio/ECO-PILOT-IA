let chart;

// 📊 Gráfica corregida (modelo más realista)
function updateChart(speed, efficiency) {
  const speeds = [40, 60, 80, 100, 120];

  // Modelo más realista: eficiencia empeora con velocidad (drag)
  const efficiencies = speeds.map(s => {
    const dragFactor = 1 + Math.pow((s / 100), 2) * 0.15;
    return (efficiency * dragFactor).toFixed(3);
  });

  const ctx = document.getElementById("efficiencyChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: speeds,
      datasets: [{
        label: "kWh/km vs Speed",
        data: efficiencies,
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: "Speed (km/h)" }},
        y: { title: { display: true, text: "kWh/km" }}
      }
    }
  });
}

// 🔥 IMPORTANTE: enganchar con tu función REAL
// (modificamos analyzeData, NO creamos otra)
const originalAnalyzeData = analyzeData;

analyzeData = async function () {
  await originalAnalyzeData();

  // después de que el server responde, tomamos valores del DOM
  const speed = parseFloat(document.getElementById("speed").value);
  const efficiency = parseFloat(document.getElementById("metricEff").textContent);

  if (!isNaN(speed) && !isNaN(efficiency)) {
    updateChart(speed, efficiency);
  }
};