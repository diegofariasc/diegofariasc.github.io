const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const MARGIN = { top: 40, right: 30, bottom: 50, left: 60 };
const DATA_PATH = "data/owid-covid-data.csv";

const parseDate = d3.timeParse("%Y-%m-%d");
const formatMonth = d3.timeFormat("%Y-%m");

const loadData = async () => {
    const rawData = await d3.csv(DATA_PATH, d => ({
        location: d.location,
        date: parseDate(d.date),
        new_cases: +d.new_cases
    }));

    const monthlyMap = d3.rollup(
        rawData
            .filter(d => d.location === "World")
            .filter(d => d.date >= new Date("2019-12-01") && d.date <= new Date("2023-05-01"))
            .filter(d => !isNaN(d.new_cases) && d.new_cases > 0),
        v => d3.sum(v, d => d.new_cases),
        d => formatMonth(d.date)
    );

    const monthlyData = Array.from(monthlyMap, ([month, cases]) => ({
        date: d3.timeParse("%Y-%m")(month),
        cases
    }));

    return monthlyData.sort((a, b) => a.date - b.date);
};

const getScales = (data) => {
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([MARGIN.left, SVG_WIDTH - MARGIN.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.cases)]).nice()
        .range([SVG_HEIGHT - MARGIN.bottom, MARGIN.top]);

    return { x, y };
};

const appendAxes = (svg, scales) => {
    svg.append("g")
        .attr("transform", `translate(0,${SVG_HEIGHT - MARGIN.bottom})`)
        .call(d3.axisBottom(scales.x)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat("%Y"))
        )
        .selectAll("text")
        .style("text-anchor", "middle");

    svg.append("g")
        .attr("transform", `translate(${MARGIN.left},0)`)
        .call(d3.axisLeft(scales.y));
};

const appendAnnotations = (svg, scales) => {

};

const appendData = (svg, data, scales) => {
    const barWidth = (SVG_WIDTH - MARGIN.left - MARGIN.right) / data.length;

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => scales.x(d.date) - barWidth / 2)
        .attr("y", scales.y(0))
        .attr("width", barWidth * 0.9)
        .attr("height", 0)
        .attr("fill", "#69b3a2")
        .transition()
        .duration(800)
        .attr("y", d => scales.y(d.cases))
        .attr("height", d => scales.y(0) - scales.y(d.cases));
};

const drawCasesBarchart = async (containerId) => {
    const container = d3.select("#" + containerId);
    container.html("");

    const svg = container.append("svg")
        .attr("width", SVG_WIDTH)
        .attr("height", SVG_HEIGHT);

    const data = await loadData();
    const scales = getScales(data);

    appendAxes(svg, scales);
    appendData(svg, data, scales);
    appendAnnotations(svg, scales);
};
