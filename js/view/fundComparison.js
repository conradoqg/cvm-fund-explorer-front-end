import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Avatar from '@material-ui/core/Avatar';
import Tooltip from '@material-ui/core/Tooltip';
import CircularProgress from '@material-ui/core/CircularProgress';
import AddIcon from '@material-ui/icons/Add';
import ClearIcon from '@material-ui/icons/Clear';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import Grey from '@material-ui/core/colors/grey';
import { withStyles } from '@material-ui/core/styles';
import { produce, setAutoFreeze } from 'immer';
import * as d3Format from 'd3-format';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly';
import dayjs from 'dayjs';
import promisesEach from 'promise-results';
import { withRouter } from 'react-router-dom';

const colors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabebe', '#469990', '#e6beff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffffff', '#000000'];
const nextColorIndex = (i) => (i % colors.length + colors.length) % colors.length;

import API from '../api';
import FundSearchView from './components/fundSearchView';
import sortOptions from './sortOptions';
import { chooseState } from '../util';

setAutoFreeze(false);
const Plot = createPlotlyComponent(Plotly);

const benchmarkNames = {
    cdi: 'CDI',
    bovespa: 'BOVESPA',
    euro: 'EURO',
    dolar: 'DÓLAR'
};

const styles = theme => ({
    optionsBar: {
        padding: theme.spacing.unit
    },
    progress: {
        margin: theme.spacing.unit * 2
    },
    select: {
        margin: theme.spacing.unit
    },
    chart: {
        padding: theme.spacing.unit * 2
    },
    help: {
        margin: 10,
        backgroundColor: Grey[600],
        width: 17,
        height: 17,
        fontSize: 10,
        fontWeight: 'bold'
    }
});

const emptyState = {
    data: {
        fundListSearch: [],
        fundListCompare: [],
        benchmark: {
            name: benchmarkNames['bovespa'],
            data: null
        },
        sortOptions: sortOptions,
        chart: []
    },
    config: {
        page: 0,
        rowsPerPage: 5,
        sort: sortOptions[0],
        search: FundSearchView.emptyState.config.search,
        searchRevision: 0,
        benchmark: 'bovespa',
        range: '1y'
    }
};

class FundComparisonView extends React.Component {
    state = emptyState;

    constructor(props) {
        super(props);

        this.state.config.benchmark = (typeof (props.match.params.benchmark) != 'undefined') ? props.match.params.benchmark : this.state.config.benchmark;
        this.state.data.benchmark.name = benchmarkNames[this.state.config.benchmark];
        this.state.data.fundListCompare = props.match.params.cnpjs ? props.match.params.cnpjs.split('/').map(cnpj => { return { cnpj, detail: null, data: null }; }) : emptyState.data.fundListCompare;
        this.state.config.range = (typeof (props.match.params.range) != 'undefined') ? props.match.params.range : this.state.config.range;

        this.replaceHistory(this.state);
    }

    async componentDidMount() {
        return this.updateData(this.state);
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const locationChanged = this.props.location !== nextProps.location;

        if (locationChanged) {
            if (this.props.history.action == 'POP') {
                this.updateData(nextProps.history.location.state);
            }
        }
    }

    handleConfigRangeChange = async event => {
        const nextState = produce(this.state, draft => {
            draft.config[event.target.name] = event.target.value;
            draft.data.fundListCompare = draft.data.fundListCompare.map(fund => {
                fund.data = null;
                return fund;
            });
            draft.data.benchmark.data = null;
            draft.data.chart = null;
        });
        this.pushHistory(nextState);
        return this.updateData(nextState);
    }

    handleConfigBenchmarkChange = async event => {
        const nextState = produce(this.state, draft => {
            draft.config[event.target.name] = event.target.value;
            draft.data.benchmark = {
                name: benchmarkNames[event.target.value],
                data: null
            };
            draft.data.chart = null;
        });
        this.pushHistory(nextState);
        return this.updateData(nextState);
    }


    handleSearchChanged = async (search) => {
        const nextState = produce(this.state, draft => {
            draft.config.search = search;
        });

        this.setState(produce(draft => {
            draft.data.fundListSearch = null;
        }));

        try {
            if (search.term != '') {
                const result = await this.getFundList(nextState.config);

                this.setState(produce(nextState, draft => {
                    draft.data.fundListSearch = result.data;
                }));
            }
        } catch (ex) {
            console.error(ex.message);
            this.setState(produce(draft => {
                draft.data.fundListSearch = ex.message;
            }));
        }
    }

    handleAddClick = async (fund) => {
        const nextState = produce(this.state, draft => {
            draft.config.searchRevision = draft.config.searchRevision + 1;
            draft.data.fundListSearch = emptyState.data.fundListSearch;
            if (!draft.data.fundListCompare.find(existingFund => existingFund.cnpj == fund.icf_cnpj_fundo)) {
                draft.data.fundListCompare.push({
                    cnpj: fund.icf_cnpj_fundo,
                    data: null
                });
            }
        });
        this.pushHistory(nextState);
        return this.updateData(nextState);
    }

    handleChartInitialized = async (figure) => {
        this.setState(produce(draft => {
            draft.data.chart = figure;
        }));
    }

    handleChartUpdate = async (fund, figure) => {
        this.setState(produce(draft => {
            draft.data.chart = figure;
        }));
    }

    handleRemoveClick = async (fund) => {
        const nextState = produce(this.state, draft => {
            draft.data.fundListCompare = draft.data.fundListCompare.filter(fundItem => fundItem.cnpj != fund.cnpj);
        });
        this.pushHistory(nextState);
        return this.updateData(nextState);
    }


    replaceHistory(nextState) {
        const desiredPath = this.props.basePath + '/' + nextState.config.benchmark + '/' + nextState.config.range + (nextState.data.fundListCompare ? '/' + nextState.data.fundListCompare.map(fund => fund.cnpj).join('/') : '');
        this.props.history.replace(desiredPath, nextState);
    }

    pushHistory(nextState) {
        const desiredPath = this.props.basePath + '/' + nextState.config.benchmark + '/' + nextState.config.range + (nextState.data.fundListCompare ? '/' + nextState.data.fundListCompare.map(fund => fund.cnpj).join('/') : '');
        this.props.history.push(desiredPath, nextState);
    }

    async updateData(nextState) {

        const benchmarkToUpdate = nextState.data.benchmark && nextState.data.benchmark.data == null ? nextState.data.benchmark : null;
        const fundsToUpdate = nextState.data.fundListCompare.filter(fund => fund.data == null);

        this.setState(produce(nextState, draft => {
            draft.data.chart = null;
        }));

        let promises = {};
        fundsToUpdate.map(fund => {
            promises[fund.cnpj] = promisesEach({ detail: this.getFundData(fund.cnpj), data: this.getFundStatistic(fund.cnpj, nextState.config) });
        });
        promises.benchmark = benchmarkToUpdate ? this.getBenchmarkStatistic(nextState.config) : null;

        let results = await promisesEach(promises);

        nextState = produce(nextState, draft => {
            if (results.benchmark) {
                if (results.benchmark instanceof Error) draft.data.benchmark.data = results.benchmark.message;
                else draft.data.benchmark.data = results.benchmark;
            }

            draft.data.fundListCompare = draft.data.fundListCompare.map(fund => {
                if (results[fund.cnpj]) {
                    if (results[fund.cnpj].data instanceof Error) fund.data = results[fund.cnpj].data.message;
                    else fund.data = results[fund.cnpj].data;

                    // TODO: getFundData should return the result or throw error
                    if (results[fund.cnpj].detail.length == 0) fund.detail = 'Não encontrado';
                    else {
                        fund.detail = {
                            name: results[fund.cnpj].detail[0].f_short_name,
                            benchmark: results[fund.cnpj].detail[0].rentab_fundo
                        };
                    }
                }

                return fund;
            });

            draft.data.chart = this.buildChart(draft.data.benchmark, draft.data.fundListCompare);
        });
        this.setState(nextState);
    }

    buildChart = (benchmark, fundList) => {
        let chartData = [];
        let colorIndex = 0;

        if (benchmark) {
            chartData.push({
                x: benchmark.data.date,
                y: benchmark.data.investment_return,
                type: 'scatter',
                mode: 'lines',
                name: benchmark.name,
                line: { color: colors[nextColorIndex(colorIndex++)] }
            });
        }

        if (fundList) {
            chartData = chartData.concat(fundList.map(fund => {
                return {
                    x: fund.data.date,
                    y: fund.data.investment_return,
                    type: 'scatter',
                    mode: 'lines',
                    name: fund.detail.name,
                    line: { color: colors[nextColorIndex(colorIndex++)] }
                };
            }));
        }

        const chart = {
            data: chartData,
            layout: {
                separators: ',.',
                autosize: true,
                showlegend: true,
                xaxis: {
                    showspikes: true,
                    spikemode: 'across'
                },
                yaxis: {
                    title: 'Desempenho',
                    tickformat: ',.0%',
                    hoverformat: ',.2%'
                }
            }
        };

        return chart;
    }

    async getBenchmarkStatistic(config) {
        let from = null;
        switch (config.range) {
            case 'mtd':
                from = new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1);
                break;
            case 'ytd':
                from = new Date((new Date()).getFullYear(), 0, 1);
                break;
            case '1m':
                from = dayjs().subtract(1, 'month').toDate();
                break;
            case '3m':
                from = dayjs().subtract(3, 'month').toDate();
                break;
            case '6m':
                from = dayjs().subtract(6, 'month').toDate();
                break;
            case '1y':
                from = dayjs().subtract(1, 'year').toDate();
                break;
            case '2y':
                from = dayjs().subtract(2, 'year').toDate();
                break;
            case '3y':
                from = dayjs().subtract(3, 'year').toDate();
                break;
        }
        return API.getBenchmarkStatistic(config.benchmark, from);
    }

    async getFundData(cnpj) {
        return API.getFundData(cnpj);
    }

    async getFundList(config) {
        return API.getFundList(config);
    }

    async getFundStatistic(cnpj, config) {
        let from = null;
        switch (config.range) {
            case 'mtd':
                from = new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1);
                break;
            case 'ytd':
                from = new Date((new Date()).getFullYear(), 0, 1);
                break;
            case '1m':
                from = dayjs().subtract(1, 'month').toDate();
                break;
            case '3m':
                from = dayjs().subtract(3, 'month').toDate();
                break;
            case '6m':
                from = dayjs().subtract(6, 'month').toDate();
                break;
            case '1y':
                from = dayjs().subtract(1, 'year').toDate();
                break;
            case '2y':
                from = dayjs().subtract(2, 'year').toDate();
                break;
            case '3y':
                from = dayjs().subtract(3, 'year').toDate();
                break;
        }

        return API.getFundStatistic(cnpj, config.benchmark, from);
    }

    render() {
        const { globalClasses, classes } = this.props;

        return (
            <div>
                <div className={globalClasses.appBarSpacer} />
                <Grid container wrap="nowrap">
                    <Grid container alignItems="center" justify="flex-start">
                        <Typography variant="display1" gutterBottom>Comparação de Fundos</Typography>
                        <Typography component="span" gutterBottom><Tooltip title={
                            <React.Fragment>
                                <p>Indicadores gerais de mercado e dos fundos de investimento.</p>
                                <p>No lado direito é possível alterar o intervalo visualizado.</p>
                            </React.Fragment>
                        }><Avatar className={classes.help}>?</Avatar></Tooltip></Typography>
                    </Grid>
                    <Grid container justify="flex-end">
                        <Grid item>
                            <Select
                                value={this.state.config.benchmark}
                                onChange={this.handleConfigBenchmarkChange}
                                className={classes.select}
                                inputProps={{
                                    name: 'benchmark',
                                    id: 'benchmark',
                                }}>
                                <MenuItem value={'cdi'}>CDI</MenuItem>
                                <MenuItem value={'bovespa'}>Bovespa</MenuItem>
                                <MenuItem value={'euro'}>Euro</MenuItem>
                                <MenuItem value={'dolar'}>Dólar</MenuItem>
                            </Select>
                            <Select
                                value={this.state.config.range}
                                onChange={this.handleConfigRangeChange}
                                className={classes.select}
                                inputProps={{
                                    name: 'range',
                                    id: 'range',
                                }}>
                                <MenuItem value={'mtd'}>Nesse mês</MenuItem>
                                <MenuItem value={'ytd'}>Nesse ano</MenuItem>
                                <MenuItem value={'1m'}>1 mês</MenuItem>
                                <MenuItem value={'3m'}>3 meses</MenuItem>
                                <MenuItem value={'6m'}>6 meses</MenuItem>
                                <MenuItem value={'1y'}>1 ano</MenuItem>
                                <MenuItem value={'2y'}>2 anos</MenuItem>
                                <MenuItem value={'3y'}>3 anos</MenuItem>
                            </Select>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid container spacing={16}>
                    <Grid item xs>
                        <Paper elevation={1} square={true} >
                            <Grid container wrap="nowrap" className={classes.optionsBar}>
                                <FundSearchView key={this.state.config.searchRevision} term={this.state.config.search.term} onSearchChanged={this.handleSearchChanged} />
                            </Grid>
                        </Paper>
                        {
                            chooseState(this.state.data.fundListSearch,
                                () => (
                                    <Paper elevation={1} square={true} className={classes.optionsBar}>
                                        {
                                            this.state.data.fundListSearch.map((fund, index) => (
                                                <Grid container spacing={8} key={index} alignItems="center" justify="center">
                                                    <Grid item xs={7}>
                                                        <Typography>
                                                            <b>{fund.f_short_name}</b><br />
                                                            <small>
                                                                <b>Patrimônio:</b> R$ {d3Format.format(',.2f')(fund.iry_accumulated_networth)}<br />
                                                                <b>Quotistas:</b> {fund.iry_accumulated_quotaholders} <br />
                                                                <b>Benchmark:</b> {fund.icf_rentab_fundo ? fund.icf_rentab_fundo : 'Não informado'}
                                                            </small>
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={4}>
                                                        <Grid container spacing={8}>
                                                            <Grid item xs={6}>
                                                                <Typography><b>Desempenho</b></Typography>
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <Typography><b>Risco</b></Typography>
                                                            </Grid>
                                                        </Grid>
                                                        <Grid container spacing={8}>
                                                            <Grid item xs={6}>
                                                                <Typography>
                                                                    <small>
                                                                        1A: {d3Format.format('.2%')(fund.iry_investment_return_1y)}<br />
                                                                        2A: {d3Format.format('.2%')(fund.iry_investment_return_2y)}<br />
                                                                        3A: {d3Format.format('.2%')(fund.iry_investment_return_3y)}
                                                                    </small>
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <Typography>
                                                                    <small>
                                                                        1A: {d3Format.format('.2%')(fund.iry_risk_1y)}<br />
                                                                        2A: {d3Format.format('.2%')(fund.iry_risk_2y)}<br />
                                                                        3A: {d3Format.format('.2%')(fund.iry_risk_3y)}<br />
                                                                    </small>
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                    <Grid item xs={1} style={{ textAlign: 'center' }}>
                                                        <IconButton
                                                            onClick={() => this.handleAddClick(fund)}>
                                                            <AddIcon />
                                                        </IconButton>
                                                    </Grid>
                                                </Grid>
                                            ))
                                        }
                                    </Paper>
                                ),
                                () => (
                                    <Paper elevation={1} square={true} className={classes.filterPaperContent}>
                                        <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                    </Paper>
                                ),
                                () => (
                                    <Paper elevation={1} square={true} className={classes.filterPaperContent}>
                                        <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
                                    </Paper>
                                )
                            )
                        }
                    </Grid>
                </Grid>
                <Grid container spacing={16}>
                    <Grid item xs>
                        <Paper elevation={1} square={true} className={classes.chart} >
                            <FundHistoryChart
                                fund={this.state.data.chart}
                                onInitialized={(figure) => this.handleChartInitialized(figure)}
                                onUpdate={(figure) => this.handleChartUpdate(figure)}
                            />
                        </Paper>
                    </Grid>
                </Grid>
                <Grid container spacing={16}>
                    <Grid item xs>
                        <Paper elevation={1} square={true} className={classes.optionsBar}>
                            {
                                chooseState(this.state.data.benchmark,
                                    () => (
                                        <Grid container spacing={8} key={this.state.config.benchmark} alignItems="center">
                                            <Grid item xs>
                                                <Grid container spacing={8}>
                                                    <Grid item>
                                                        <span style={{ backgroundColor: colors[nextColorIndex(0)], minWidth: '10px', height: '100%', display: 'block' }}></span>
                                                    </Grid>
                                                    <Grid item xs>
                                                        <Typography>
                                                            <b>{this.state.data.benchmark.name}</b><br />
                                                            <small>
                                                                &nbsp;
                                                            </small>
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Grid>

                                            {
                                                chooseState(this.state.data.benchmark.data,
                                                    () => (
                                                        <React.Fragment>
                                                            <Grid item xs={1}>
                                                                <Typography>
                                                                    Desempenho: {d3Format.format('.2%')(this.state.data.benchmark.data.investment_return[this.state.data.benchmark.data.investment_return.length - 1])}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={1}>
                                                                <Typography>
                                                                    Risco: {d3Format.format('.2%')(this.state.data.benchmark.data.risk[this.state.data.benchmark.data.risk.length - 1])}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={1}>
                                                                <Typography>&nbsp;</Typography>
                                                            </Grid>
                                                            <Grid item xs={1}>
                                                                <Typography>&nbsp;</Typography>
                                                            </Grid>
                                                        </React.Fragment>
                                                    ),
                                                    () => (
                                                        <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                                    ),
                                                    () => (
                                                        <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
                                                    )
                                                )
                                            }
                                        </Grid>
                                    ),
                                    () => (
                                        <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                    ),
                                    () => (
                                        <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
                                    )
                                )
                            }
                            {
                                chooseState(this.state.data.fundListCompare,
                                    () => (
                                        <React.Fragment>
                                            {
                                                this.state.data.fundListCompare.map((fundObject, index) => (
                                                    <Grid container spacing={8} key={index} alignItems="center" justify="center">
                                                        {
                                                            chooseState(fundObject.detail,
                                                                () => (
                                                                    <Grid item xs>
                                                                        <Grid container spacing={8}>
                                                                            <Grid item>
                                                                                <span style={{ backgroundColor: colors[nextColorIndex(index + 1)], minWidth: '10px', height: '100%', display: 'block' }}></span>
                                                                            </Grid>
                                                                            <Grid item xs>
                                                                                <Typography>
                                                                                    <b>{fundObject.detail.name}</b><br />
                                                                                    <small>
                                                                                        <b>Benchmark:</b> {fundObject.detail.benchmark ? fundObject.detail.benchmark : 'Não informado'}
                                                                                    </small>
                                                                                </Typography>
                                                                            </Grid>
                                                                        </Grid>
                                                                    </Grid>
                                                                ),
                                                                () => (
                                                                    <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                                                ),
                                                                () => (
                                                                    <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
                                                                )
                                                            )
                                                        }
                                                        {
                                                            chooseState(fundObject.data,
                                                                () => (
                                                                    <React.Fragment>
                                                                        <Grid item xs={1}>
                                                                            <Typography>
                                                                                Desempenho: {d3Format.format('.2%')(fundObject.data.investment_return[fundObject.data.investment_return.length - 1])}
                                                                            </Typography>
                                                                        </Grid>
                                                                        <Grid item xs={1}>
                                                                            <Typography>
                                                                                Risco: {d3Format.format('.2%')(fundObject.data.risk[fundObject.data.risk.length - 1])}
                                                                            </Typography>
                                                                        </Grid>
                                                                        <Grid item xs={1}>
                                                                            <Typography>
                                                                                Sharpe: {d3Format.format('.2')(fundObject.data.sharpe[fundObject.data.sharpe.length - 1])}
                                                                            </Typography>
                                                                        </Grid>
                                                                    </React.Fragment>
                                                                ),
                                                                () => (
                                                                    <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                                                )
                                                            )
                                                        }
                                                        <Grid item xs={1} style={{ textAlign: 'center' }}>
                                                            <IconButton
                                                                onClick={() => this.handleRemoveClick(fundObject)}>
                                                                <ClearIcon color="error" />
                                                            </IconButton>
                                                        </Grid>
                                                    </Grid>
                                                ))
                                            }
                                        </React.Fragment>
                                    ),
                                    () => (
                                        <Paper elevation={1} square={true} className={classes.filterPaperContent}>
                                            <Typography variant="subheading" align="center"><CircularProgress className={classes.progress} /></Typography>
                                        </Paper>
                                    ),
                                    () => (
                                        <Paper elevation={1} square={true} className={classes.filterPaperContent}>
                                            <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
                                        </Paper>
                                    )
                                )
                            }
                        </Paper>
                    </Grid>
                </Grid>
            </div >
        );
    }
}

const FundHistoryChart = (props) => {
    const { fund, handleChartInitialized, handleChartUpdate } = props;

    return chooseState(
        fund,
        () => (
            <Plot
                key="FundComparison"
                data={fund.data}
                layout={fund.layout}
                config={
                    {
                        locale: 'pt-BR',
                        displayModeBar: true
                    }
                }
                onInitialized={handleChartInitialized}
                onUpdate={handleChartUpdate}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
            />
        ),
        () => (
            <Typography variant="subheading" align="center"><CircularProgress /></Typography>
        ),
        () => (
            <Typography variant="subheading" align="center">Não foi possível carregar o dado, tente novamente mais tarde.</Typography>
        ));
};

module.exports = withStyles(styles)(withRouter(FundComparisonView));