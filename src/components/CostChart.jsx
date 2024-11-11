import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import Papa from 'papaparse';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Select, MenuItem, Button, FormControl, InputLabel, Box, Typography } from '@mui/material';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const CostChart = () => {
    const [usages, setUsages] = useState([]);
    const [costs, setCosts] = useState([]);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [models, setModels] = useState([]);
    const [types, setTypes] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedType, setSelectedType] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const usagesResponse = await fetch('/usages.csv');
            const costsResponse = await fetch('/costs.csv');
            const usagesText = await usagesResponse.text();
            const costsText = await costsResponse.text();

            const usages = Papa.parse(usagesText, { header: true }).data;
            const costs = Papa.parse(costsText, { header: true }).data;

            const uniqueModels = [...new Set(usages.map(usage => usage.model))];
            const uniqueTypes = [...new Set(usages.map(usage => usage.type))];
            setModels(uniqueModels);
            setTypes(uniqueTypes);
            setUsages(usages);
            setCosts(costs);

            calculateDailyCosts(usages, costs);
        };

        fetchData();
    }, []);

    const calculateDailyCosts = (usages, costs) => {
        const costMap = {};
        costs.forEach(({ model, input, output }) => {
            costMap[model] = {
                cost_input: parseFloat(input),
                cost_output: parseFloat(output),
            };
        });

        const dailyCosts = {};
        usages.forEach(usage => {
            const { model, created_at, usage_input, usage_output } = usage;
            if(created_at){
                const dateFormatted = created_at.split('.').reverse().join('-');

                if (!costMap[model]) return;

                const totalCost =
                    (costMap[model].cost_input * parseFloat(usage_input)) +
                    (costMap[model].cost_output * parseFloat(usage_output));

                if (!dailyCosts[dateFormatted]) {
                    dailyCosts[dateFormatted] = 0;
                }
                dailyCosts[dateFormatted] += totalCost;
            }
        });

        const sortedDates = Object.keys(dailyCosts)
            .sort((a, b) => new Date(a) - new Date(b));
        const dataPoints = sortedDates.map(date => dailyCosts[date]);

        setChartData({
            labels: sortedDates,
            datasets: [{
                label: 'Дневные затраты',
                data: dataPoints,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.3,
                fill: true,
            }],
        });
    };

    const handleFilterChange = () => {
        fetchDataWithFilters(selectedModel, selectedType);
    };

    const fetchDataWithFilters = async (model, type) => {
        const filteredUsages = usages.filter(usage => 
            (!model || usage.model === model) && 
            (!type || usage.type === type)
        );

        calculateDailyCosts(filteredUsages, costs);
    };

    return (
        <div>
            <Typography variant="h2" align="center">
                Общие затраты за каждый день
            </Typography>
            <Line data={chartData} />
            <Box display="flex" gap="20px" m="15px" alignItems="center" justifyContent="center">
                <FormControl variant="outlined" style={{ minWidth: 120 }}>
                    <InputLabel>Модель</InputLabel>
                    <Select
                        value={selectedModel}
                        onChange={e => {
                            setSelectedModel(e.target.value);
                        }}
                        label="Модель"
                    >
                        <MenuItem key="allModels" value=""><em>Все модели</em></MenuItem>
                        {models.map(model => (
                            <MenuItem key={model} value={model}>{model}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl variant="outlined" style={{ minWidth: 120 }}>
                    <InputLabel>Тип</InputLabel>
                    <Select
                        value={selectedType}
                        onChange={e => {
                            setSelectedType(e.target.value);
                        }}
                        label="Тип"
                    >
                        <MenuItem key="allTypes" value=""><em>Все типы</em></MenuItem>
                        {types.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button variant="contained" color="primary" size="large" onClick={handleFilterChange}>
                    Применить фильтр
                </Button>
            </Box>
        </div>
    );
};

export default CostChart;
