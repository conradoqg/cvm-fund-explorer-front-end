import React, { useCallback } from 'react';
import Plotly from '../vendor/plotly';
import { useHistory } from 'react-router-dom';
import { StringParam, useQueryParam, withDefault } from 'use-query-params';
import createPlotlyComponent from 'react-plotly.js/factory';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Skeleton from '@material-ui/lab/Skeleton';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import { formatters, chartFormatters, settle, reportErrorIfNecessary, isError, useRendering, useEffect, useState } from '../util';
import { rangeOptions } from './option';
import ShowStateComponent from './component/showStateComponent';
import API from '../api';

const Plot = createPlotlyComponent(Plotly);

const useStyles = makeStyles(theme => ({
    select: {
        margin: theme.spacing(1)
    },
    chart: {
        padding: theme.spacing(2)
    },
    withTooltip: theme.withTooltip,
    appBarSpacer: theme.mixins.toolbar,
}));

const emptyState = {
    data: {
        chart: {
            data: [],
            layout: {},
            frames: []
        }
    },
    config: {
        xField: 'irm_risk_1y',
        yField: 'irm_investment_return_1y',
        sizeField: 'irm_accumulated_networth',
        range: '1y'
    }
};

const availableAxisFields = [
    {
        name: 'irm_accumulated_investment_return',
        displayName: 'Desempenho acumulado',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_mtd',
        displayName: 'Desempenho até o mês',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_ytd',
        displayName: 'Desempenho até o ano',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_1m',
        displayName: 'Desempenho 1 mês',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_3m',
        displayName: 'Desempenho 3 meses',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_6m',
        displayName: 'Desempenho 6 meses',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_1y',
        displayName: 'Desempenho 1 ano',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_2y',
        displayName: 'Desempenho 2 anos',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_investment_return_3y',
        displayName: 'Desempenho 3 anos',
        formatter: chartFormatters.investment_return
    },
    {
        name: 'irm_accumulated_risk',
        displayName: 'Risco acumulado',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_mtd',
        displayName: 'Risco até o mês',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_ytd',
        displayName: 'Risco até o ano',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_1m',
        displayName: 'Risco 1 mês',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_3m',
        displayName: 'Risco 3 meses',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_6m',
        displayName: 'Risco 6 meses',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_1y',
        displayName: 'Risco 1 ano',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_2y',
        displayName: 'Risco 2 anos',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_risk_3y',
        displayName: 'Risco 3 anos',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_accumulated_sharpe',
        displayName: 'Sharpe CDI acumulado',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_mtd',
        displayName: 'Sharpe CDI até o mês',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_ytd',
        displayName: 'Sharpe CDI até o ano',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_1m',
        displayName: 'Sharpe CDI 1 mês',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_3m',
        displayName: 'Sharpe CDI 3 meses',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_6m',
        displayName: 'Sharpe CDI 6 meses',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_1y',
        displayName: 'Sharpe CDI 1 ano',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_2y',
        displayName: 'Sharpe CDI 2 anos',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_sharpe_3y',
        displayName: 'Sharpe CDI 3 anos',
        formatter: chartFormatters.float
    },
    {
        name: 'irm_cdi_consistency_mtd',
        displayName: 'Consistência CDI até o mês',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_ytd',
        displayName: 'Consistência CDI até o ano',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_1m',
        displayName: 'Consistência CDI 1 mês',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_3m',
        displayName: 'Consistência CDI 3 meses',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_6m',
        displayName: 'Consistência CDI 6 meses',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_1y',
        displayName: 'Consistência CDI 1 ano',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_2y',
        displayName: 'Consistência CDI 2 anos',
        formatter: chartFormatters.risk
    },
    {
        name: 'irm_cdi_consistency_3y',
        displayName: 'Consistência CDI 3 anos',
        formatter: chartFormatters.risk
    }

];

const availableSizeFields = [
    {
        name: 'irm_accumulated_networth',
        displayName: 'Patrimônio',
        formatter: chartFormatters.networth,
        sizeref: 10000000
    },
    {
        name: 'irm_accumulated_quotaholders',
        displayName: 'Cotistas',
        formatter: chartFormatters.int,
        sizeref: 100
    }
];

function buildChart(data, config) {
    const xFieldData = availableAxisFields.find(field => field.name === config.xField);
    const yFieldData = availableAxisFields.find(field => field.name === config.yField);
    const sizeFieldData = availableSizeFields.find(field => field.name === config.sizeField);

    // Create a lookup table to sort and regroup the columns of data,
    // first by irm_dt_comptc, then by icf_classe:
    const lookup = {};
    function getData(irm_dt_comptc, icf_classe) {
        let byIRM_dt_comptc = null;
        let trace = null;

        if (!(byIRM_dt_comptc = lookup[irm_dt_comptc])) {
            byIRM_dt_comptc = lookup[irm_dt_comptc] = {};
        }
        // If a container for this irm_dt_comptc + icf_classe doesn't exist yet,
        // then create one:
        if (!(trace = byIRM_dt_comptc[icf_classe])) {
            trace = byIRM_dt_comptc[icf_classe] = {
                x: [],
                y: [],
                id: [],
                text: [],
                marker: { size: [] }
            };
        }
        return trace;
    }

    let xRange = [0, 0];
    let yRange = [0, 0];
    let sizeRange = [0, 0];

    // Go through each row, get the right trace, and append the data:
    for (var i = 0; i < data.length; i++) {
        const datum = data[i];
        const trace = getData(datum.irm_dt_comptc, formatters.field['icf_classe'](datum.icf_classe));
        const xValue = datum[config.xField];
        const yValue = datum[config.yField];
        const sizeValue = datum[config.sizeField];

        xRange = [Math.min(xRange[0], xValue), Math.max(xRange[1], xValue)];
        yRange = [Math.min(yRange[0], yValue), Math.max(yRange[1], yValue)];
        sizeRange = [Math.min(sizeRange[0], sizeValue), Math.max(sizeRange[1], sizeValue)];

        trace.text.push(datum.f_short_name);
        trace.id.push(datum.f_cnpj);
        trace.x.push(xValue);
        trace.y.push(yValue);
        trace.marker.size.push(sizeValue);
    }

    // Get the group names:
    const irm_dt_comptcs = Object.keys(lookup);
    // In this case, every irm_dt_comptc includes every icf_classe, so we
    // can just infer the icf_classes from the *first* irm_dt_comptc:
    const firstIRM_dt_comptc = lookup[irm_dt_comptcs[0]];
    const icf_classes = Object.keys(firstIRM_dt_comptc);

    // Create the main traces, one for each icf_classe:
    const traces = [];
    for (i = 0; i < icf_classes.length; i++) {
        let data = firstIRM_dt_comptc[icf_classes[i]];
        // One small note. We're creating a single trace here, to which
        // the frames will pass data for the different irm_dt_comptcs. It's
        // subtle, but to avoid data reference problems, we'll slice
        // the arrays to ensure we never write any new data into our
        // lookup table:
        traces.push({
            name: icf_classes[i],
            x: data.x.slice(),
            y: data.y.slice(),
            id: data.id.slice(),
            text: data.text.slice(),
            mode: 'markers',
            marker: {
                size: data.marker.size.slice(),
                sizemode: 'area',
                sizeref: sizeFieldData.sizeref
            },
            hovertemplate:
                "<b>%{text}</b><br><br>" +
                `%{xaxis.title.text}: %{x:${xFieldData.formatter.hoverformat}}<br>` +
                `%{yaxis.title.text}: %{y:${yFieldData.formatter.hoverformat}}<br>` +
                `${sizeFieldData.displayName}: ${sizeFieldData.formatter.tickprefix} %{marker.size:${sizeFieldData.formatter.hoverformat}}` +
                "<extra></extra>"
        });
    }

    // Create a frame for each irm_dt_comptc. Frames are effectively just
    // traces, except they don't need to contain the *full* trace
    // definition (for example, appearance). The frames just need
    // the parts the traces that change (here, the data).
    const frames = [];
    for (i = 0; i < irm_dt_comptcs.length; i++) {
        frames.push({
            name: irm_dt_comptcs[i],
            // eslint-disable-next-line no-loop-func
            data: icf_classes.map(icf_classe => getData(irm_dt_comptcs[i], formatters.field['icf_classe'](icf_classe)))
        });
    }

    // Now create slider steps, one for each frame. The slider
    // executes a plotly.js API command (here, Plotly.animate).
    // In this example, we'll animate to one of the named frames
    // created in the above loop.
    const sliderSteps = [];
    for (i = 0; i < irm_dt_comptcs.length; i++) {
        sliderSteps.push({
            method: 'animate',
            label: formatters.month(irm_dt_comptcs[i]),
            args: [[irm_dt_comptcs[i]], {
                mode: 'immediate',
                transition: { duration: 300 },
                frame: { duration: 300, redraw: false },
            }]
        });
    }

    const layout = {
        xaxis: {
            title: xFieldData.displayName,
            tickformat: xFieldData.formatter.tickformat,
            hoverformat: xFieldData.formatter.hoverformat,
            range: xRange
        },
        yaxis: {
            title: yFieldData.displayName,
            tickformat: yFieldData.formatter.tickformat,
            hoverformat: yFieldData.formatter.hoverformat,
            range: yRange
        },
        hovermode: 'closest',
        clickmode: 'select+event',
        // We'll use updatemenus (whose functionality includes menus as
        // well as buttons) to create a play button and a pause button.
        // The play button works by passing `null`, which indicates that
        // Plotly should animate all frames. The pause button works by
        // passing `[null]`, which indicates we'd like to interrupt any
        // currently running animations with a new list of frames. Here
        // The new list of frames is empty, so it halts the animation.
        updatemenus: [{
            x: 0,
            y: 0,
            yanchor: 'top',
            xanchor: 'left',
            showactive: false,
            direction: 'left',
            type: 'buttons',
            pad: { t: 87, r: 10 },
            buttons: [{
                method: 'animate',
                args: [null, {
                    mode: 'immediate',
                    fromcurrent: true,
                    transition: { duration: 1000 },
                    frame: { duration: 2000, redraw: false }
                }],
                label: '>'
            }, {
                method: 'animate',
                args: [[null], {
                    mode: 'immediate',
                    transition: { duration: 0 },
                    frame: { duration: 0, redraw: false }
                }],
                label: '||'
            }]
        }],
        // Finally, add the slider and use `pad` to position it
        // nicely next to the buttons.
        sliders: [{
            pad: { l: 170, t: 55 },
            currentvalue: {
                visible: true,
                prefix: 'Data: ',
                xanchor: 'right',
                font: { size: 20, color: '#666' }
            },
            steps: sliderSteps
        }]
    };

    // Create the plot:
    return {
        data: traces,
        layout,
        frames,
        config: {
            locale: 'pt-BR',
            displayModeBar: true
        }
    };
}

function FundComparativeView(props) {
    // Data
    const [chart, setChart] = useState(emptyState.data.chart);

    // Config from URL
    const [xField, setXField] = useQueryParam('x', withDefault(StringParam, emptyState.config.xField));
    const [yField, setYField] = useQueryParam('y', withDefault(StringParam, emptyState.config.yField));
    const [sizeField, setSizeField] = useQueryParam('s', withDefault(StringParam, emptyState.config.sizeField));
    const [range, setRange] = useQueryParam('r', withDefault(StringParam, emptyState.config.range));

    const history = useHistory();
    const styles = useStyles();
    useRendering();

    // Updaters
    const updateData = useCallback(async function updateData(xField, yField, sizeField, range) {
        const result = await settle(fetchFundsTimeseries({ xField, yField, sizeField, range }));

        try {
            if (isError(result)) {
                setChart(result);
            } else {
                setChart(buildChart(result, { xField, yField, sizeField, range }));
            }
        } catch (ex) {
            console.log(ex.stack);
        }

        reportErrorIfNecessary(result);
    }, []);

    // Effects
    useEffect(() => {
        setChart(emptyState.data.chart);

        updateData(xField, yField, sizeField, range);
    }, [updateData, xField, yField, sizeField, range]);

    // Fetchers
    function fetchFundsTimeseries(config) {
        const from = rangeOptions.find(range => range.name === config.range).toDate();

        return API.getFundsTimeseries(from, [config.xField, config.yField, config.sizeField]);
    }

    // Handlers
    function handleChartClick(data) {
        if (data.event.ctrlKey) history.push('/funds/' + data.points[0].data.id[data.points[0].pointIndex]);
    }

    function handleXFieldChange(event) {
        setXField(event.target.value);
    }

    function handleYFieldChange(event) {
        setYField(event.target.value);
    }

    function handleSizeFieldChange(event) {
        setSizeField(event.target.value);
    }

    function handleRangeChange(event) {
        setRange(event.target.value);
    }

    return (
        <React.Fragment>
            <div className={styles.appBarSpacer} />
            <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                    <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                            <Tooltip enterTouchDelay={100} leaveTouchDelay={5000} title={
                                <React.Fragment>
                                    <p>Comparativo de fundos de investimento sobre o tempo.</p>
                                    <p>Somente fundos listados na BTG Pactual, XP Investimentos e Modal Mais são exibidos.</p>
                                    <p>No lado direito é possível alterar os campos de X e Y, tamanho do ponto e o intervalo visualizado.</p>
                                    <p>Selecione fundos clicando nele (e utilize o shift para adicionar outro a seleção).</p>
                                    <p>Clique utilizando o &#60;CTRL&#62; para abrir detalhes do fundo.</p>
                                </React.Fragment>
                            }>
                                <Typography variant="h5" className={styles.withTooltip}>Comparativo de Fundos</Typography>
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item>
                    <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                            <Select
                                value={xField}
                                onChange={handleXFieldChange}
                                className={styles.select}
                                inputProps={{
                                    name: 'xField',
                                    id: 'xField',
                                }}>
                                {availableAxisFields.map(axisField => (<MenuItem key={axisField.name} value={axisField.name}>{axisField.displayName}</MenuItem>))}
                            </Select>
                        </Grid>
                        <Grid item>
                            <Typography variant="h6" component="span">x</Typography>
                        </Grid>
                        <Grid item>
                            <Select
                                value={yField}
                                onChange={handleYFieldChange}
                                className={styles.select}
                                inputProps={{
                                    name: 'yField',
                                    id: 'yField',
                                }}>
                                {availableAxisFields.map(axisField => (<MenuItem key={axisField.name} value={axisField.name}>{axisField.displayName}</MenuItem>))}
                            </Select>
                        </Grid>
                        <Grid item>
                            <Typography variant="h6" component="span">o</Typography>
                        </Grid>
                        <Grid item>
                            <Select
                                value={sizeField}
                                onChange={handleSizeFieldChange}
                                className={styles.select}
                                inputProps={{
                                    name: 'sizeField',
                                    id: 'sizeField',
                                }}>
                                {availableSizeFields.map(sizeField => (<MenuItem key={sizeField.name} value={sizeField.name}>{sizeField.displayName}</MenuItem>))}
                            </Select>
                        </Grid>
                        <Grid item>
                            <Select
                                value={range}
                                onChange={handleRangeChange}
                                className={styles.select}
                                inputProps={{
                                    name: 'range',
                                    id: 'range',
                                }}>
                                {rangeOptions.filter(range => range.name !== 'best').map(range => (<MenuItem key={range.name} value={range.name}>{range.displayName}</MenuItem>))}
                            </Select>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                <Grid item xs>
                    <Paper elevation={1} square={true} className={styles.chart} >
                        <ShowStateComponent
                            data={chart}
                            hasData={() => (
                                <Plot
                                    data={chart.data}
                                    layout={chart.layout}
                                    frames={chart.frames}
                                    config={chart.config}
                                    onClick={handleChartClick}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '800px' }}
                                />
                            )}
                            isNull={() => (<Typography variant="subtitle1" align="center"><Skeleton variant="rect" height={800} /></Typography>)}
                            isErrored={() => (<Typography variant="subtitle1" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>)}
                        />
                    </Paper>
                </Grid>
            </Grid>
        </React.Fragment>
    );
}

export default FundComparativeView;