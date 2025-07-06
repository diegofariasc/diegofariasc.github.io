const drawCovidMap = async (containerId) => {
    const WIDTH = 960;
    const HEIGHT = 500;
    const DATA_MONTH = "2021-01";

    const svg = d3.select("#" + containerId)
        .html("")
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);

    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([WIDTH / 2, HEIGHT / 2]);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleSequentialLog()
        .interpolator(d3.interpolateReds)
        .domain([1, 1e6]);

    const tooltip = d3.select("#tooltip");

    const [world, covidRaw] = await Promise.all([
        d3.json("data/world.geojson"),
        d3.csv("data/owid-covid-data.csv", d => ({
            location: d.location,
            iso_code: d.iso_code,
            date: d3.timeParse("%Y-%m-%d")(d.date),
            cases: +d.new_cases,
            deaths: +d.new_deaths
        }))
    ]);

    const formatMonth = d3.timeFormat("%Y-%m");
    const covidDataByMonth = d3.rollup(
        covidRaw.filter(d => d.iso_code && !isNaN(d.cases)),
        v => ({
            cases: d3.sum(v, d => d.cases),
            deaths: d3.sum(v, d => d.deaths)
        }),
        d => formatMonth(d.date),
        d => d.iso_code
    );

    const dataForMonth = covidDataByMonth.get(DATA_MONTH) || new Map();
    const countries = world.features;

    svg.selectAll("path")
        .data(countries)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const iso = d.id;
            const value = dataForMonth.get(iso);
            return value ? colorScale(value.cases || 1) : "#eee";
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
            const iso = d.id;
            const value = dataForMonth.get(iso);
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.properties.name || iso}</strong><br>
                       Cases: ${value?.cases?.toLocaleString() || "N/A"}<br>
                       Deaths: ${value?.deaths?.toLocaleString() || "N/A"}`);
        })
        .on("mousemove", event => {
            tooltip
                .style("top", (event.pageY + 15) + "px")
                .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });
};
