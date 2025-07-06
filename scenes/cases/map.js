let currentMonth = "2021-01";
let currentMetric = "new_cases";

const drawCovidMap = async (containerId) => {
    const WIDTH = 960;
    const HEIGHT = 500;

    const svg = d3.select("#" + containerId)
        .html("")
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);

    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([WIDTH / 2, HEIGHT / 2]);

    const path = d3.geoPath().projection(projection);

    const tooltip = d3.select("#tooltip");

    const [world, covidRaw] = await Promise.all([
        d3.json("data/world.geojson"),
        d3.csv("data/owid-covid-data.csv", d => ({
            location: d.location,
            iso_code: d.iso_code,
            date: d3.timeParse("%Y-%m-%d")(d.date),
            new_cases: +d.new_cases,
            new_deaths: +d.new_deaths
        }))
    ]);

    const formatMonth = d3.timeFormat("%Y-%m");

    // Create map: month -> iso_code -> values
    const covidDataByMonth = d3.rollup(
        covidRaw.filter(d => d.iso_code),
        v => ({
            new_cases: d3.sum(v, d => d.new_cases),
            new_deaths: d3.sum(v, d => d.new_deaths)
        }),
        d => formatMonth(d.date),
        d => d.iso_code
    );

    const countries = world.features;

    // Color scales for the two metrics
    const colorScales = {
        new_cases: d3.scaleSequentialLog()
            .interpolator(d3.interpolateBlues)
            .domain([1, 1e7]),
        new_deaths: d3.scaleSequentialLog()
            .interpolator(d3.interpolateReds)
            .domain([1, 5e5])
    };

    const updateMap = () => {
        const dataForMonth = covidDataByMonth.get(currentMonth) || new Map();

        const colorScale = colorScales[currentMetric] || (() => "#eee");

        svg.selectAll("path")
            .data(countries)
            .join("path")
            .attr("d", path)
            .attr("fill", d => {
                const iso = d.id;
                const value = dataForMonth.get(iso);
                const metricValue = value ? value[currentMetric] : null;
                return metricValue && metricValue > 0 ? colorScale(metricValue) : "#eee";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => {
                const iso = d.id;
                const value = dataForMonth.get(iso);
                tooltip
                    .style("visibility", "visible")
                    .html(`<strong>${d.properties.name || iso}</strong><br>
                 ${currentMetric === "new_cases" ? "New Cases" : "New Deaths"}: ${value?.[currentMetric]?.toLocaleString() || "N/A"}`);
            })
            .on("mousemove", event => {
                tooltip
                    .style("top", (event.pageY + 15) + "px")
                    .style("left", (event.pageX + 15) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        // Show selected month label
        svg.selectAll(".month-label").remove();
        svg.append("text")
            .attr("class", "month-label")
            .attr("x", WIDTH - 150)
            .attr("y", HEIGHT - 30)
            .attr("font-size", "20px")
            .attr("fill", "black")
            .attr("font-weight", "bold")
            .text(`Selected Month: ${currentMonth}`);
    };

    // Expose functions so barChart can control
    window.updateMapMonth = (newMonth) => {
        currentMonth = newMonth;
        updateMap();
        // Also highlight the bar in the bar chart
        if (window.highlightBar) {
            window.highlightBar(currentMonth);
        }
    };

    window.updateMapMetric = (newMetric) => {
        currentMetric = newMetric;
        updateMap();
    };

    // Initial render
    updateMap();
};
