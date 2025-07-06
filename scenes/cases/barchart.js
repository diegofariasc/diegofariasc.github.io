const drawBarChart = async (containerId) => {
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 960 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create dropdown selector
    const container = d3.select("#" + containerId);
    container.html(""); // Clear previous contents

    container.append("label")
        .text("Select data: ")
        .style("font-weight", "bold");

    const selector = container.append("select")
        .attr("id", "metric-selector")
        .style("margin-bottom", "10px");

    selector.selectAll("option")
        .data([
            { label: "New confirmed cases", value: "new_cases" },
            { label: "New confirmed deaths", value: "new_deaths" }
        ])
        .join("option")
        .attr("value", d => d.value)
        .text(d => d.label);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatMonth = d3.timeFormat("%Y-%m");

    const rawData = await d3.csv("data/owid-covid-data.csv", d => ({
        date: parseDate(d.date),
        location: d.location,
        new_cases: +d.new_cases,
        new_deaths: +d.new_deaths
    }));

    // Filter world data
    const worldData = rawData
        .filter(d => d.location === "World" && d.date && !isNaN(d.new_cases) && !isNaN(d.new_deaths))
        .map(d => ({ ...d, month: formatMonth(d.date) }));

    // Aggregate monthly new cases/deaths (sum per month)
    const monthlyDataMap = d3.rollup(
        worldData,
        v => ({
            date: d3.timeParse("%Y-%m")(v[0].month),
            new_cases: d3.sum(v, d => d.new_cases),
            new_deaths: d3.sum(v, d => d.new_deaths)
        }),
        d => d.month
    );

    const monthlyData = Array.from(monthlyDataMap.values()).sort((a, b) => a.date - b.date);

    const x = d3.scaleTime()
        .domain(d3.extent(monthlyData, d => d.date))
        .range([0, width]);

    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10));

    const y = d3.scaleLinear().range([height, 0]);
    const yAxis = svg.append("g");

    const tooltip = d3.select("#tooltip");

    const updateChart = (metric) => {
        y.domain([0, d3.max(monthlyData, d => d[metric])]).nice();
        yAxis.transition().duration(500).call(d3.axisLeft(y));

        const bars = svg.selectAll("rect").data(monthlyData, d => d.date);

        bars.join(
            enter => enter.append("rect")
                .attr("x", d => x(d.date))
                .attr("width", width / monthlyData.length - 1)
                .attr("y", y(0))
                .attr("height", 0)
                .attr("fill", metric === "new_cases" ? "steelblue" : "darkred")
                .on("mouseover", (event, d) => {
                    tooltip
                        .style("visibility", "visible")
                        .html(`
              <strong>${formatMonth(d.date)}</strong><br>
              ${metric === "new_cases" ? "New Cases" : "New Deaths"}: ${d[metric].toLocaleString()}
            `);
                })
                .on("mousemove", event => {
                    tooltip
                        .style("top", (event.pageY + 15) + "px")
                        .style("left", (event.pageX + 15) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                })
                .on("click", (event, d) => {
                    const selectedMonth = formatMonth(d.date);
                    window.updateMapMonth(selectedMonth);
                })
                .transition()
                .duration(800)
                .attr("y", d => y(d[metric]))
                .attr("height", d => y(0) - y(d[metric])),

            update => update
                .transition()
                .duration(800)
                .attr("fill", metric === "new_cases" ? "steelblue" : "darkred")
                .attr("y", d => y(d[metric]))
                .attr("height", d => y(0) - y(d[metric]))
        );

        // Highlight selected month bar
        svg.selectAll("rect")
            .attr("stroke", d => formatMonth(d.date) === currentMonth ? "orange" : "none")
            .attr("stroke-width", d => formatMonth(d.date) === currentMonth ? 3 : 0);
    };

    // Initial metric
    let currentMetric = "new_cases";
    // Sync with global currentMonth if defined
    if (window.currentMonth) {
        currentMetric = document.getElementById("metric-selector").value;
    }

    // Initial chart draw
    updateChart(currentMetric);

    selector.on("change", function () {
        currentMetric = this.value;
        updateChart(currentMetric);
        window.updateMapMetric(currentMetric);
    });

    // Expose a function to highlight selected month (used when map updates the month)
    window.highlightBar = (month) => {
        currentMonth = month;
        svg.selectAll("rect")
            .attr("stroke", d => formatMonth(d.date) === currentMonth ? "orange" : "none")
            .attr("stroke-width", d => formatMonth(d.date) === currentMonth ? 3 : 0);
    };
};

