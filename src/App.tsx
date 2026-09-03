import './App.css'
import {type CSSProperties, type JSX, useState} from "react";
import moment from "moment";

type CSS = Partial<CSSProperties>;
  
type Icon = 'currencyConversion' | 'stats';
const ICONS: Record<Icon, JSX.Element> = {
  currencyConversion:
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#1f1f1f" viewBox="0 -960 960 960">
      <path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77 77-114T840-480h80q0 91-34.5 171T791-169 651-74.5 480-40m-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314t56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592t23 41 83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5-38.5 25-47 14.5v50zM40-480q0-91 34.5-171T169-791t140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77-77 114T120-480z"/>
    </svg>,
  stats:
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#1f1f1f" viewBox="0 -960 960 960">
      <path d="M160-160v-320h160v320zm240 0v-640h160v640zm240 0v-440h160v440z"/>
    </svg>
};

const WARN_THRESHOLD = 0.80;

const CURRENCIES = ['USD', 'HKD', 'SGD', 'NTD', 'JPY', 'THB'] as const;
type Currency = typeof CURRENCIES[number];

// TODO add settings for this
const USDCurrencyConversionMap: Record<Currency, number> = {
  HKD: 7.5,
  JPY: 150,
  NTD: 30,
  SGD: 1.25,
  THB: 30,
  USD: 1
};

const TAGS = ['brown', 'red', 'orange', 'gold', 'green', 'blue', 'purple'];
type Tag = typeof TAGS[number];
const TagColorMap: Record<Tag, string> = {
  brown: '#765B2E',
  red: '#C80428',
  orange: '#FB6107',
  gold: '#F7C204',
  green: '#7AC74F',
  blue: '#2D7DD2',
  purple: '#5E0462',
};

type Expense = {
  currency: Currency;
  amount: number;
  timestamp: number;
  description?: string;
  excluded?: boolean;
  tag?: Tag;
};

type SpendPeriod = {
  expenses: Expense[];
  currency: Currency;
  multiCurrency?: boolean;
  limit: number;
  total: number;
  start: number;
  end?: number;
  name?: string;
};

type LimitsSettings = Record<Currency, number>;

type Settings = {
  currency: Currency;
  limits: LimitsSettings;
  tagsNames?: Record<Tag, string>;
};

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  limits: {
    USD: 20,
    JPY: 200,
    SGD: 20,
    NTD: 600,
    HKD: 160,
    THB: 600,
  }
};

type SerializedData = {
  periods: SpendPeriod[];
  settings: Settings;
};

const BOILERPLATE_PERIOD: SpendPeriod = {
  expenses: [],
  limit: DEFAULT_SETTINGS.limits['USD'],
  currency: 'USD',
  start: Date.now(),
  total: 0,
};

function usd(val: number, currency: Currency): number {
  if (currency === 'USD') {
    return val;
  }
  return Number.parseFloat((val / USDCurrencyConversionMap[currency]).toFixed(2));
}

// TODO implement later
// function convert(val: number, currencyFrom: Currency, currencyTo: Currency): number {
//   if (currency === 'USD') {
//     return val;
//   }
//   return Number.parseFloat((val / USDCurrencyConversionMap[currency]).toFixed(2));
// }

function usdAll(periods: SpendPeriod[]) {
  const newPeriods: SpendPeriod[] = [];
  let i = 0;
  while (i < periods.length) {
    const newPeriod = {...periods[i]}; // prevent editing actual period.
    newPeriod.total = usd(newPeriod.total, newPeriod.currency);
    newPeriod.limit = usd(newPeriod.limit, newPeriod.currency);
    newPeriod.currency = 'USD';
    newPeriods.push(newPeriod);
    i++;
  }

  return newPeriods;
}

function getExpensesFromPeriods(periods: SpendPeriod[]) {
  const expenses: Expense[] = [];
  periods.forEach((p) => {
    expenses.push(...p.expenses);
  });
  return expenses;
}

/* @ts-ignore */
function getConsecutiveCurrencyPeriodGroups(periods: SpendPeriod[], currency: Currency) {
  const periodGroups: SpendPeriod[][] = [];
  let grouped: SpendPeriod[] = [];
  let i = 0;
  while (i < periods.length) {
    const period = periods[i];
    if (period.currency !== currency) {
      periodGroups.push(grouped);
      grouped = [];
    } else {
      grouped.push(period);
    }
    i++;
  }

  return periodGroups;
}

function getConsecutiveCurrencyPeriods(periods: SpendPeriod[], currency: Currency) {
  const newPeriods: SpendPeriod[] = [];
  let isSame = true;
  let i = 0;
  while (isSame && i < periods.length) {
    const period = periods[i];
    if (period.currency !== currency) {
      isSame = false;
    } else {
      newPeriods.push(period);
    }
    i++;
  }

  return newPeriods;
}

type StatPage = 'compact' | 'range' | 'rangeUSD' | 'tagView';
const StatPageTitleMap: Record<StatPage, string> = {
  'compact': 'overunders at a glance',
  'range' : 'selected overunders',
  'rangeUSD': 'everything USD',
  'tagView': 'tags!'
};
const PageIndexStatPageMap: Record<number, StatPage> = {
  0: 'compact',
  1: 'range',
  2: 'rangeUSD',
  3: 'tagView',
};

// @ts-ignore
function ModalContext({onClickBackground, children}:{onClickBackground: () => void, children: any}){
  const style: CSS = {
    background: "rgba(61,93,140,0.05)",
    display: "flex",
    position: "fixed",
    width: "100vw",
    height: "100vh",
    justifyContent: "center",
    top: 0,
    left: 0,
    zIndex: 2,
  };

  // @ts-ignore
  const onClickBackgroundLocal = (e: any) => {
    // e.preventDefault();
    // e.stopPropagation();
    // onClickBackground();
  };

  return <div style={style} onClick={onClickBackgroundLocal}>{children}</div>
}

// TODO replace all amounts with this
/* @ts-ignore */
function Amount({
  currency,
  amount,
  showDecimal,
  amountContainerStyle,
  currencyStyle,
  amountStyle,
  onClickAmount,
}:{
  currency: Currency;
  amount: number;
  showDecimal?: boolean;
  onClickAmount?: (amount: number, currency: Currency) => void;
  amountContainerStyle?: CSS;
  currencyStyle?: CSS;
  amountStyle?: CSS;
}) {
  const localOnClick = () => {
    if (onClickAmount) {
      onClickAmount(amount, currency);
    }
  };

  const decimalAmount = showDecimal ? amount.toFixed(2) : undefined;

  return (
    <span style={amountContainerStyle} onClick={localOnClick}>
      <span style={currencyStyle}>{currency}</span>
      <span style={amountStyle}>{decimalAmount ?? amount}</span>
    </span>
  );
}

function CompactExpense({
  exp,
  toggleConversion,
}: {
  exp: Expense;
  toggleConversion: boolean;
})  {
  // TODO for decimal currencies, do toFixed(2) on them
  const amount = toggleConversion ? usd(exp.amount, exp.currency) : exp.amount;
  const currency: Currency = toggleConversion ? 'USD' : exp.currency;

  const contStyle: CSS = {
    marginBlock: "4px",
  };

  const excludedTexStyle: CSS = {
    fontSize: "8px",
    lineHeight: "8px",
    marginBottom: "0",
  };

  const currencyStyle: CSS = {
    fontSize: "10px",
  };

  const timeStyle: CSS = {
    fontSize: "10px",
    lineHeight: "10px",
    marginTop: "2px",
  };

  const amountStyle: CSS = {
    fontSize: "12px",
  };

  const descButtonStyle: CSS = {
    fontSize: "11px",
  };

  const tagOverrideStyle: CSS | undefined = exp.tag ? {
    color: TagColorMap[exp.tag],
    userSelect: "none",
  } : undefined;

  const desc = exp.description;

  return (
    <div style={contStyle}>
      {exp.excluded ? <p style={excludedTexStyle}>Excluded</p> : null}
      <span style={tagOverrideStyle}>
        <span style={currencyStyle}>{currency}</span>
        <span style={amountStyle}>{amount}</span>
        {exp.tag ? <Tag tag={exp.tag}/> : null}
      </span>
      <p style={timeStyle}>{moment(exp.timestamp).format("DD/MM/YY HH:mm")}</p>
      <Description
        readOnly={true}
        initialButtonStyle={descButtonStyle}
        initialShowText={!!desc}
        description={desc}
        onAddDescription={() => undefined}
      />
    </div>
  )
}

function CompactOverUnder({
  period,
  toggleConversion,
}: {
  period: SpendPeriod;
  toggleConversion: boolean;
}){
  let limit = toggleConversion ? usd(period.limit, period.currency) : period.limit;
  let total = toggleConversion ? usd(period.total, period.currency) : period.total;
  let currency: Currency = toggleConversion ? 'USD' : period.currency;
  let text = total > limit ? 'over' : 'under';
  text = total === limit ? 'at' : text;
  let color = total >= limit ? 'red' : 'green';
  color = total >= (limit * WARN_THRESHOLD) && total < limit ? 'orange' : color;

  const currencyStyle: CSS = {
    fontSize: "10px",
  };

  const priceFont: CSS = {
    fontSize: "16px",
    fontWeight: "bold"
  };

  const totalStyle: CSS = {
    color,
    ...priceFont
  };

  const overunderStyle: CSS = {
    color,
    fontSize: "14px",
  };

  return (
    <div key={period.start}>
      <span style={currencyStyle}>{currency}</span>
      <span style={totalStyle}>{total}</span>
      <span style={overunderStyle}>&nbsp;{text}&nbsp;</span>
      <span style={currencyStyle}>{currency}</span>
      <span style={priceFont}>{limit}</span>
    </div>
  );
}

function StatValue({
  label,
  labelStyle,
  value,
  valueStyle,
  containerStyle,
  noValueMessage,
}:{
  label: string;
  labelStyle?: CSS;
  value: string | number | JSX.Element | null;
  valueStyle?: CSS;
  containerStyle?: CSS;
  noValueMessage?: string;
}) {
  const defaultContainerStyle: CSS = {
    fontSize: "12px"
  };

  const defaultValueStyle: CSS = {
    fontSize: "13px",
    fontWeight: "bold",
  }

  if (value === null) {
    return (
      <div style={containerStyle ?? defaultContainerStyle}>{noValueMessage ?? 'nothing to show'}</div>
    );
  }

  let formattedValue;
  if (typeof value === 'number') {
    formattedValue = value.toFixed(2);
  }

  return (
    <div style={containerStyle ?? defaultContainerStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle ?? defaultValueStyle}>{formattedValue ?? value}</span>
    </div>
  );
}

const EMPTY_TAG_NAMES:  Record<Tag, string> = {
  brown: '',
  red: '',
  orange: '',
  gold: '',
  green: '',
  blue: '',
  purple: '',
};

function TagNamer({
  settings,
  onClickTag,
  onTrySave
}: {
  settings: Settings;
  onClickTag: (tag: Tag) => void;
  onTrySave: () => void;
}) {
  const [tagNames, setTagNames] = useState<Record<Tag, string>>(settings.tagsNames ?? EMPTY_TAG_NAMES);

  const onChangeTagName = (tag: Tag, name: string) => {
    if (!settings.tagsNames) {
      // TODO this block can be removed after tagNames is set
      settings.tagsNames = EMPTY_TAG_NAMES;
    }

    settings.tagsNames[tag] = name;
    const newTagNames = {...settings.tagsNames};
    setTagNames(newTagNames);
    onTrySave();
  };

  const TagNameField = ({tag, name}: {tag: Tag, name: string}) => {
    const tagNameFieldStyle: CSS = {
      display: "flex",
      marginBlock: "2px"
    };

    const descLabel = '+Name';
    const descStyle: CSS = {
      color: TagColorMap[tag],
      fontSize: "12px",
    };

    const moreStyle: CSS = {
      cursor: "pointer"
    };

    return (
      <div style={tagNameFieldStyle}>
        <Tag tag={tag} onClickTag={onClickTag} moreStyle={moreStyle}/>
        <Description
          textStyleOverride={descStyle}
          label={descLabel}
          description={name}
          initialShowText={!!name}
          onAddDescription={(text) => onChangeTagName(tag, text)}/>
      </div>
    );
  };

  return (
    <div>
      {Object.entries(tagNames).map((t) => <TagNameField key={`tn${t}`} tag={t[0]} name={t[1]}/>)}
    </div>
  );
}

function TagView({
  expenses,
  settings,
  onTrySave,
  toggleConversion,
}: {
  expenses: Expense[];
  settings: Settings;
  onTrySave: () => void;
  toggleConversion: boolean;
}) {
  const [from, setFrom] = useState(
    (expenses.length > 0 ? moment(expenses[expenses.length - 1].timestamp) : moment()).format("YYYY-MM-DD HH:mm")
  );
  const [to, setTo] = useState(moment().format("YYYY-MM-DD HH:mm"));
  const [tagFilter, setTagFilter] = useState<Tag[]>([]);

  const onSetFrom = (e: any) => {
    setFrom(e.target.value);
    e.stopPropagation();
  };

  const onSetTo = (e: any) => {
    setTo(e.target.value);
    e.stopPropagation();
  };

  const onSetTagFilter = (tag: Tag) => {
    let newFilter;
    if (tagFilter.includes(tag)) {
      newFilter = tagFilter.filter((t) => t !== tag);
    } else {
      newFilter = [...tagFilter, tag];
    }
    setTagFilter(newFilter);
  };

  const filteredExpenses = expenses.filter((e) => {
    const toM = moment(to);
    const fromM = moment(from);
    const passesTagFilter = tagFilter.length > 0 ? tagFilter.includes(e.tag ?? '') : true;
    return moment(e.timestamp).isSameOrAfter(fromM) && moment(e.timestamp).isSameOrBefore(toM) && passesTagFilter && e.tag;
  });

  let totalOfExpenses = 0;
  let totalOfExpensesText = null;
  filteredExpenses.forEach((fe) => totalOfExpenses += fe.amount);
  if (toggleConversion) {
    totalOfExpenses = usd(totalOfExpenses, settings.currency);
  }
  if (totalOfExpenses > 0) {
    const currencyStyle: CSS = {
      fontSize: "10px"
    };
    totalOfExpensesText = <><span style={currencyStyle}>{toggleConversion ? 'USD' : settings.currency}</span><span>{totalOfExpenses}</span></>
  }

  const labelStyle: CSS = {
    fontSize: "12px",
    display: "block",
  };

  const tagViewContainerStyle: CSS = {
    maxHeight: "400px",
    overflowY: "scroll",
  };

  return (
    <div style={tagViewContainerStyle}>
      <TagNamer settings={settings} onClickTag={onSetTagFilter} onTrySave={onTrySave}/>
      <hr/>
      <label style={labelStyle}>
        from&nbsp;
        <input type={"datetime-local"} value={from} onChange={onSetFrom}/>
      </label>
      <label style={labelStyle}>
        to&nbsp;
        <input type={"datetime-local"} value={to} onChange={onSetTo}/>
      </label>
      <div>
        {tagFilter.map((t) => <Tag key={`tf${t}`} tag={t}/>)}
      </div>
      <hr/>
      {filteredExpenses.length > 0 ? <StatValue label={'total of shown expenses: '} value={totalOfExpensesText}/> : null}
      <hr/>
      {filteredExpenses.length > 0 ?
        filteredExpenses.map((e) => <CompactExpense key={`ce${e.timestamp}`} exp={e} toggleConversion={toggleConversion}/>)
        :
        <div>no expenses in range</div>
      }
    </div>
  );
}

function RangeStat({
  periods,
  currency,
  toggleConversion,
  containerStyle,
}: {
  periods: SpendPeriod[];
  currency: Currency;
  toggleConversion: boolean;
  containerStyle?: CSS;
}) {
  const [from, setFrom] = useState(
    (periods.length > 0 ? moment(periods[periods.length - 1].start) : moment()).format("YYYY-MM-DD HH:mm")
  );
  const [to, setTo] = useState(moment().format("YYYY-MM-DD HH:mm"));

  const onSetFrom = (e: any) => {
    setFrom(e.target.value);
    e.stopPropagation();
  };

  const onSetTo = (e: any) => {
    setTo(e.target.value);
    e.stopPropagation();
  };

  const periodsInRange = periods.filter((p) => {
    const toM = moment(to);
    const fromM = moment(from);
    if (p.end) {
      return moment(p.start).isSameOrAfter(fromM) && moment(p.end).isSameOrBefore(toM);
    }
    return moment(p.start).isSameOrAfter(fromM) && moment().isSameOrBefore(toM);
  });

  let totalOfPeriods: number | null = null;
  let periodsIncluded = 0;
  let lowestPeriodValue: number | null = Number.MAX_SAFE_INTEGER;
  let lowestPeriod: SpendPeriod | null =  null;
  let highestPeriodValue: number | null = Number.MIN_SAFE_INTEGER;
  let highestPeriod: SpendPeriod | null = null;
  if (periodsInRange.length > 0) {
    totalOfPeriods = 0;
    periodsInRange.forEach((p) => {
      if (p.currency === currency) {
        totalOfPeriods! += p.total;
        periodsIncluded++;

        if (p.total > highestPeriodValue!) {
          highestPeriodValue = p.total;
          highestPeriod = p;
        }

        if (p.total < lowestPeriodValue!) {
          lowestPeriodValue = p.total;
          lowestPeriod = p;
        }
      }
    });
    totalOfPeriods =  totalOfPeriods === 0 ? null : totalOfPeriods
    if (totalOfPeriods) {
      totalOfPeriods = toggleConversion ? usd(totalOfPeriods, currency) : totalOfPeriods;
    }
  }

  let averageOfPeriods = null;
  if (totalOfPeriods) {
    averageOfPeriods = parseFloat((totalOfPeriods / periodsIncluded).toFixed(2));
    // Don't need to toggleConversion as this is derived from totalOfPeriods which will already be converted.
  }

  const labelStyle: CSS = {
    fontSize: "12px",
    display: "block",
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        from&nbsp;
        <input type={"datetime-local"} value={from} onChange={onSetFrom}/>
      </label>
      <label style={labelStyle}>
        to&nbsp;
        <input type={"datetime-local"} value={to} onChange={onSetTo}/>
      </label>
      <StatValue label={`total of ${periodsIncluded} ${currency} periods: `} value={totalOfPeriods} noValueMessage={`no periods have ${currency} (change in settings)`}/>
      <StatValue label={`average of ${periodsIncluded} ${currency}  periods: `} value={averageOfPeriods} noValueMessage={`cannot calculate average`}/>
      <StatValue label={`highest spend: `} value={highestPeriod ? <CompactOverUnder period={highestPeriod} toggleConversion={toggleConversion}/> : null} noValueMessage={`cannot calculate highest spend`}/>
      <StatValue label={`lowest spend: `} value={lowestPeriod ? <CompactOverUnder period={lowestPeriod} toggleConversion={toggleConversion}/> : null} noValueMessage={`cannot calculate lowest spend`}/>
      <hr/>
      {periodsInRange.length > 0 ?
        periodsInRange.map((p) => <CompactOverUnder key={p.start} period={p} toggleConversion={toggleConversion}/>)
        :
        <div>no spend periods in range</div>
      }
    </div>
  )
}

// function CompactListStat({
//   periods,
//   toggleConversion,
//   style
// }:{
//   periods: SpendPeriod[];
//   toggleConversion: boolean;
//   style: CSS;
// }) {
//   return (
//     <div style={statsDisplayStyle}>
//       {periods.map((p) => <CompactOverUnder period={p} toggleConversion={toggleConversion}/>)}
//     </div>
//   );
// }

function Stats({
  periods,
  settings,
  onClose,
  onTrySave,
  toggleConversion,
}: {
  periods: SpendPeriod[];
  settings: Settings;
  onClose: () => void;
  onTrySave: () => void;
  toggleConversion: boolean;
}) {
  // @ts-ignore
  const [page, setPage] = useState<StatPage>('compact');
  const [pageIndex, setPageIndex] = useState(0);
  const [consecutiveOnly, setConsecutiveOnly] = useState(true);

  const maxLength = Object.entries(PageIndexStatPageMap).length;

  const onBack = (e: any) => {
    let newIdx = pageIndex - 1;
    newIdx = newIdx < 0 ? 0 : newIdx;
    setPageIndex(newIdx);
    setPage(PageIndexStatPageMap[newIdx]);
    e.stopPropagation();
  };

  const onNext = (e: any) => {
    let newIdx = pageIndex + 1;
    newIdx = newIdx >= maxLength ? maxLength - 1 : newIdx;
    setPageIndex(newIdx);
    setPage(PageIndexStatPageMap[newIdx]);
    e.stopPropagation();
  };

  const onConsecutiveOnly = () => {
    setConsecutiveOnly(!consecutiveOnly);
  };

  const statsDisplayStyle: CSS = {
    maxHeight: "400px",
    overflowY: "scroll",
  };

  let statDisplay;
  let periodsToUse = consecutiveOnly ? getConsecutiveCurrencyPeriods(periods, settings.currency) : periods;
  if (page === 'compact') {
    statDisplay = (
      <div style={statsDisplayStyle}>
        {periodsToUse.map((p) => <CompactOverUnder key={`cou${p.start}`} period={p} toggleConversion={toggleConversion}/>)}
      </div>
    );
  } else if (page === 'range') {
    statDisplay = <RangeStat key={'range'} periods={periodsToUse} currency={settings.currency} toggleConversion={toggleConversion} containerStyle={statsDisplayStyle}/>;
  } else if (page === 'rangeUSD') {
    const periodsInUSD = usdAll(periods);
    statDisplay = <RangeStat key={'rangeUSD'} periods={periodsInUSD} currency={'USD'} toggleConversion={toggleConversion} containerStyle={statsDisplayStyle}/>;
  } else if (page === 'tagView' ) {
    const expenses = consecutiveOnly ?
      getExpensesFromPeriods(getConsecutiveCurrencyPeriods(periods, settings.currency))
      : getExpensesFromPeriods(periods);
    statDisplay = <TagView expenses={expenses} settings={settings} onTrySave={onTrySave} toggleConversion={toggleConversion}/>;
  }

  const titleStyle: CSS = {
    marginBlock: "8px"
  };

  const buttonContStyle: CSS = {
    bottom: 0,
    left: 0,
    width: "100%",
    marginBottom: "20px",
    position: "absolute",
    display: "flex",
    justifyContent: "center",
    flexDirection: "column"
  };

  const styleStatsContainer: CSS = {
    background: "white",
    border: "none",
    borderRadius: "3px",
    minWidth: "300px",
    minHeight: "500px",
    maxHeight: "500px",
    marginBlock: "3em",
    marginInline: "6em",
    padding: "18px",
    position: "relative",
    zIndex: 3,
  };

  const checkboxStyle: CSS = {
    fontSize: "11px",
  };
  
  return (
    <div style={styleStatsContainer}>
      <h4 style={titleStyle}>{StatPageTitleMap[page]}</h4>
      {statDisplay}
      <div style={buttonContStyle}>
        <div>
          <button onClick={onBack} disabled={pageIndex === 0}>{'<'}</button>&nbsp;
          <button onClick={onClose}>Close</button>&nbsp;
          <button onClick={onNext} disabled={pageIndex === maxLength - 1}>{'>'}</button>
        </div>
        {page !== 'rangeUSD' ? <div style={checkboxStyle}>
          <label>
            <input type="checkbox" onChange={onConsecutiveOnly} checked={consecutiveOnly}/>
            same-currency period group
          </label>
        </div> : null}
      </div>
    </div>
  );
}

function Settings({
  initial,
  onChangeSettings
}: {
  initial?: Settings
  onChangeSettings: ({}: any) => void
}) {
  const [currCurrency, setCurrCurrency] = useState<Currency>(initial?.currency ?? DEFAULT_SETTINGS.currency);
  const [limits, setLimits] = useState<LimitsSettings>(initial?.limits ?? DEFAULT_SETTINGS.limits);

  const onChangeLimitSettings = (currency: Currency, amount: number) => {
    const newLimits = {...limits, [currency]: amount};
    setLimits(newLimits);
    onChangeSettings({currency: currCurrency, limits: newLimits});
  }

  const onClickCurrencyBadge = (currency: Currency) => {
    setCurrCurrency(currency);
    onChangeSettings({currency, limits});
  }

  const CurrencyBadge = ({currency}:{currency: Currency}) => {
    const bgColor = currency === currCurrency ? 'gold' : 'white';
    const style: CSS = {
      backgroundColor: bgColor,
      borderRadius: "50px",
      cursor: "pointer",
      display: "inline-block",
      lineHeight: "48px",
      marginInline: "8px",
      width: "48px",
      height: "48px",
      textAlign: "center",
      fontWeight: "bold",
    }

    return (
      <div style={style} onClick={() => onClickCurrencyBadge(currency)}>
        {currency}
      </div>
    );
  };

  const LimitInput = ({currency}:{currency: Currency}) => {
    const [val, setVal] = useState(limits[currency]);

    const inputStyle: CSS = {
      fontSize: '18px',
      height: '24px',
      width: '80px',
    };

    const divStyle: CSS = {
      marginBlock: '8px'
    };

    return (
      <div style={divStyle}>
        <label>
          {currency} Limit:&nbsp;
          <input style={inputStyle} type="number" value={val}
                 onBlur={() => onChangeLimitSettings(currency, parseFloat(val.toFixed(2)))}
                 onChange={(e) => setVal(parseFloat(e.target.value))}/>
        </label>
      </div>
    );
  };

  const contStyle: CSS = {
    marginBlock: "12px"
  };

  return (
    <div style={contStyle}>
      {CURRENCIES.map((c, i) => <CurrencyBadge key={`cb${i}`} currency={c}/>)}
      {CURRENCIES.map((c, i) => <LimitInput key={`cl${i}`} currency={c}/>)}
    </div>
  )
}

function Tag({
  tag,
  onClickTag,
  moreStyle = {},
}: {
  tag: Tag | null;
  onClickTag?: (tag: Tag) => void;
  moreStyle?: CSS;
}) {
  if (tag === null) {
    return null;
  }

  const onClickTagLocal = () => {
    if (onClickTag) {
      onClickTag(tag);
    }
  };

  const tagStyle: CSS = {
    background: TagColorMap[tag],
    display: "inline-block",
    height: "14px",
    width: "14px",
    border:" none",
    borderRadius: "14px",
    marginLeft: "4px",
    ...moreStyle
  };

  // TODO add react tooltip to show tag name?
  return (
    <div style={tagStyle} onClick={onClickTagLocal}/>
  );
}

function NewExpense({
  onAddExpense,
  settings
}:{
  onAddExpense: ({}: any) => void;
  settings: Settings;
}){
  const [expense, setExpense] = useState(0);

  const inputStyle: CSS = {
    border: "none",
    borderBottom: "2px solid #333",
    fontSize: "36px",
    lineHeight: "36px",
    width: "150px",
  };

  const buttonStyle: CSS = {
    height: "50px",
    width: "50px",
    fontWeight: "bolder",
    padding: "4px",
    marginLeft: "8px",
    fontSize: "36px",
  };

  const onAddExpenseLocal = () => {
    if(Number.isNaN(expense) || expense === 0) {
      return;
    }
    onAddExpense(expense);
    setExpense(0);
  }

  const onChangeExpense = (e: any) => {
    const newVal = parseFloat(e.target.value);
    setExpense(newVal);
  }

  return (
    <div>
      <span>{settings.currency}</span>
      <input key="newExpenseInput" style={inputStyle} type="number" placeholder={`What's new`} value={expense} onChange={onChangeExpense}/>
      <button style={buttonStyle} onClick={onAddExpenseLocal}>+</button>
    </div>
  );
}

function Description({
  initialShowText,
  description,
  onAddDescription,
  label = '+Desc',
  initialButtonStyle,
  readOnly,
  textStyleOverride,
}:{
  initialShowText: boolean;
  description?: string;
  onAddDescription: ({}: any) => void;
  label?: string;
  initialButtonStyle?: CSS;
  readOnly?: boolean;
  textStyleOverride?: CSS;
}){
  const [text, setText] = useState(description);
  const [showText, setShowText] = useState(initialShowText);
  const [editing, setEditing] = useState(false);

  const textStyle: CSS = {
    fontSize: "12px"
  };

  if (readOnly && text) {
    return (
      <div style={textStyleOverride ?? textStyle}>
        {description}
      </div>
    );
  } else if (readOnly && !text) {
    return null;
  }

  const onClickText = () => {
    setShowText(false);
    setEditing(true);
  }

  if (text && showText && !editing) {
    return (
      <div style={textStyleOverride ?? textStyle} onClick={onClickText} >
        {description}
      </div>
    );
  }
  
  const onClickEdit = () => {
    setShowText(true);
    setEditing(true);
  }

  if (((!showText || !text) || (showText && !text)) && !editing) {
    return (
      <div>
        <button style={initialButtonStyle} onClick={onClickEdit}>{label}</button>
      </div>
    )
  }

  const onAdd = () => {
    let toAdd = text?.trim() ?? '';
    if (toAdd === '') {
      return;
    }
    onAddDescription(text);
    setEditing(false);
  }

  const onCloseEdit = () => {
    setShowText(true);
    setEditing(false);
  }

  return (
    <div>
      <input type="text" maxLength={28} value={text} placeholder={"describe this..."} onChange={(e) => setText(e.target?.value ?? '')}/>
      <button onClick={onAdd}>+</button>
      <button onClick={onCloseEdit}>x</button>
    </div>
  )
}

function ViewExpense ({
  exp,
  setTrySave,
  onDeleteExpense,
  onExcludeExpense,
  allowDelete,
  conversionToggled,
}: {
  exp: Expense;
  setTrySave: ({}: any) => void;
  onDeleteExpense: ({}: any) => void;
  onExcludeExpense: () => void;
  allowDelete: boolean;
  conversionToggled: boolean;
})  {
  const [desc, setDesc] = useState(exp.description);
  const [excluded, setExcluded] = useState(exp.excluded);
  const [tag, setTag] = useState<Tag | null>(exp.tag ?? null);
  const [tagIndex, setTagIndex] = useState<number | null>(exp.tag ? TAGS.indexOf(exp.tag) : null);

  const onAddDescription = (text: string) => {
    if (text !== undefined) {
      exp.description = text;
      setDesc(text);
      setTrySave(true);
    }
  };

  const onExcludeExpenseLocal = () => {
    exp.excluded = !exp.excluded;
    onExcludeExpense();
    setExcluded(true);
  };

  const onChangeTag = () => {
    let newTag;
    if (tagIndex === null) {
      setTagIndex(0);
      newTag = TAGS[0];
      setTag(TAGS[0]);
    } else {
      let newIdx = tagIndex + 1;
      if (newIdx >= TAGS.length) {
        // cycled back to default
        setTagIndex(null);
        setTag(null);
        newTag = undefined;
      } else {
        setTagIndex(newIdx);
        setTag(TAGS[newIdx]);
        newTag = TAGS[newIdx];
      }
    }
    exp.tag = newTag;
    setTrySave(true);
  };

  // TODO for decimal currencies, do toFixed(2) on them
  const amount = conversionToggled ? usd(exp.amount, exp.currency) : exp.amount;
  const currency: Currency = conversionToggled ? 'USD' : exp.currency;

  const allowExclude = allowDelete; // Just a simple alias for now.
  const excludeText = exp.excluded ? 'Include' : 'Exclude';
  const excludeBtnStyle: CSS = {
    fontSize: "11px",
  };

  const deleteContStyle: CSS = {
    marginBlock: "0",
  };

  const deleteBtnStyle: CSS = {
    fontSize: "11px",
  };

  const descButtonStyle: CSS = {
    fontSize: "11px",
  };

  const excludedTexStyle: CSS = {
    fontSize: "10px",
    lineHeight: "10px",
    marginBottom: "0",
  };

  const contStyle: CSS = {
    marginBlock: "10px",
  };

  const currencyStyle: CSS = {
    fontSize: "12px",
  };

  const timeStyle: CSS = {
    fontSize: "12px",
    lineHeight: "12px",
    marginTop: "4px",
  };

  const tagOverrideStyle: CSS | undefined = tag ? {
    color: TagColorMap[tag],
    userSelect: "none",
  } : undefined;

  return (
    <div style={contStyle}>
      {excluded ? <p style={excludedTexStyle}>Excluded</p> : null}
      <span onClick={onChangeTag} style={tagOverrideStyle}><span style={currencyStyle}>{currency}</span><span>{amount}</span><Tag tag={tag}/></span>
      <p style={timeStyle}>{moment(exp.timestamp).format("DD/MM/YY HH:mm")}</p>
      <Description initialButtonStyle={descButtonStyle} initialShowText={!!desc} description={desc} onAddDescription={onAddDescription}/>
      {allowExclude ? <button style={excludeBtnStyle} onClick={onExcludeExpenseLocal}>{excludeText}</button> : null}
      {allowDelete ? <AreYouSure initialButtonStyle={deleteBtnStyle} initialButtonLabel={'Delete'} onYes={() => onDeleteExpense(exp.timestamp)} containerStyle={deleteContStyle}/> : null}
    </div>
  )
}

function SpendPeriod({
  period,
  onTrySave,
  onDeleteExpense,
  onExcludeExpense,
  // @ts-ignore
  isMultiCurrency = false,
  allowDelete,
  conversionToggled,
}: {
  period: SpendPeriod;
  onTrySave: () => void;
  onDeleteExpense: ({}: any, {}: any) => void;
  onExcludeExpense: ({}: any, {}: any) => void;
  isMultiCurrency?: boolean;
  allowDelete: boolean;
  conversionToggled: boolean;
}) {
  // @ts-ignore
  //const [expenses, setExpenses] = useState(period.expenses);

  const onDeleteExpenseInPeriod = (timestamp: number) => {
    const newExpenses: Expense[] = period.expenses.filter(e => e.timestamp != timestamp);

    let newSpend = 0;
    newExpenses.forEach((e) => newSpend += e.amount);

    period.expenses = newExpenses;
    period.total = newSpend;
    const newPeriod: SpendPeriod = {...period}
    onDeleteExpense(newPeriod, newSpend);
  };

  const onExcludeExpenseInPeriod = () => {
    let newSpend = 0;
    period.expenses.forEach((e) => {
      if (!e.excluded) {
        newSpend += e.amount;
      }
    });

    period.total = newSpend;
    onExcludeExpense(period, newSpend);
  };

  return (
    <div>
      {period.expenses.map((e, i) =>
        <ViewExpense
          key={`${e.timestamp}${i}`}
          exp={e}
          setTrySave={onTrySave}
          onDeleteExpense={onDeleteExpenseInPeriod}
          onExcludeExpense={onExcludeExpenseInPeriod}
          allowDelete={allowDelete}
          conversionToggled={conversionToggled}
        />)}
    </div>
  );
}

function Toggle({
  onToggle,
  label,
  icon,
  index,
  isActive
}:{
  onToggle: () => void,
  label?: string,
  icon?: Icon,
  index: number,
  isActive: boolean
}){
  let fallback = '-';
  const fromBottom = index == 1 ? 24 : (24 * index) + 40;
  const background = isActive ? "rgba(255,215,0,0.95)" : "rgba(230,230,230,0.95)";
  const textColor = isActive ? "#333" : undefined;

  const toggleStyle: CSS = {
    background,
    position: "fixed",
    bottom: fromBottom,
    right: 24,
    border: "none",
    borderRadius: "50px",
    width: "48px",
    height: "48px",
    fontSize: "22px",
    fontWeight: "bolder",
    color: textColor,
    cursor: "pointer",
    userSelect: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  };

  const iconSvg = icon ? ICONS[icon] : undefined;

  return (
    <div style={toggleStyle} onClick={onToggle}>
      {label ?? iconSvg ?? fallback}
    </div>
  );
}

function AreYouSure({
  initialButtonLabel,
  onYes,
  containerStyle,
  initialButtonStyle
}:{
  initialButtonLabel: string;
  onYes: () => void;
  containerStyle?: CSS;
  initialButtonStyle?: CSS;
})  {
  const [showAreYouSure, setShowAreYouSure] = useState(false);

  const onInitialClick = () => setShowAreYouSure(true);

  const textStyle: CSS = {
    fontSize: "14px"
  };

  const contStyle: CSS = containerStyle ?? {
    marginTop: "8px",
    marginBottom: "8px"
  };

  const YesOrNo = () => (
    <div>
      <span style={textStyle}>Are you sure?</span>&nbsp;
      <button onClick={onYes}>Yes</button>&nbsp;
      <button onClick={() => setShowAreYouSure(false)}>No</button>
    </div>
  );

  return (
    <div style={contStyle}>
      {!showAreYouSure ? <button style={initialButtonStyle} onClick={onInitialClick}>{initialButtonLabel}</button> : null}
      {showAreYouSure ? <YesOrNo/> : null}
    </div>
  );
}

function App() {
  const [spent, setSpent] = useState(0);
  const [periods, setPeriods] = useState<SpendPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<SpendPeriod>(BOILERPLATE_PERIOD);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [triedLoad, setTriedLoad] = useState(false);
  const [trySave, setTrySave] = useState(false);
  const [toggleConversion, setToggleConversion] = useState(false);
  const [toggleStats, setToggleStats] = useState(false);

  /* serialization functions */

  const loadFromBrowser = (): SpendPeriod[] | undefined => {
    let periodsJson = localStorage.getItem('periods') ?? undefined;
    let settingsJson = localStorage.getItem('settings') ?? undefined;

    let loaded;
    if (periodsJson) {
      const loadedPeriods: SpendPeriod[] = JSON.parse(periodsJson);
      const currentPeriod: SpendPeriod = loadedPeriods[0];

      setCurrentPeriodIndex(0);
      setCurrentPeriod(currentPeriod);
      setPeriods(loadedPeriods);
      setSpent(currentPeriod.total);
      loaded = loadedPeriods;
    }

    if (settingsJson) {
      const loadedSettings = JSON.parse(settingsJson);
      setSettings(loadedSettings);
    }

    if (loaded) return loaded;
  };

  const saveToBrowser = () => {
    // TODO need to check if periods is full and retrieve from second item
    localStorage.setItem('periods', JSON.stringify(periods));
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  if (!triedLoad) {
    const loadedPeriods = loadFromBrowser();

    if (loadedPeriods?.length === 0) {
      const newPeriod: SpendPeriod = {
        expenses: [],
        limit: settings.limits[settings.currency],
        currency: settings.currency,
        start: Date.now(),
        total: 0,
      };

      setPeriods([newPeriod]);
      setCurrentPeriod(newPeriod);
    }

    setTriedLoad(true);
  }

  if (trySave) {
    saveToBrowser();
    setTrySave(false);
  }

  const exportData = () => {
    const data: SerializedData = {
      periods,
      settings,
    };
    const serializedJson = JSON.stringify(data);

    const now = new Date(Date.now());
    const time = `${now.getDate()}${now.getMonth()}${now.getFullYear()}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
    const filename = `overunder_${time}.json`;
    const file = new Blob([serializedJson], {
      type: "application/json",
    });

    const blobUrl = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = blobUrl;
    anchor.style.display = 'none';

    try {
      // Append the anchor, click it, and clean up
      document.body.appendChild(anchor);
      anchor.click();
    } catch {
      alert('Something went wrong with exporting data.');
    } finally {
      // Remove the anchor and revoke the object URL
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    }
  }

  /* state functions */

  const onChangeSettings = (newSettings: Settings) => {
    setSettings(newSettings);

    // Not the current period that is being display, which is what it normally means.
    const actualCurrentPeriod = periods[0];

    const newPeriod: SpendPeriod = {...actualCurrentPeriod, limit: newSettings.limits[newSettings.currency], currency: newSettings.currency};
    const newPeriods = [...periods];
    newPeriods[0] = newPeriod;
    setPeriods(newPeriods);
    setCurrentPeriodIndex(0);
    setCurrentPeriod(newPeriod);
    setSpent(newPeriod.total);

    //Try to save
    setTrySave(true);
  }

  const onAddExpense = (value: number) => {
    if (value === 0) {
      return;
    }

    const newExpense: Expense = {
      currency: settings.currency, // TODO use periods currency?
      amount: value,
      timestamp: Date.now(),
    }

    // Not the current period that is being display, which is what it normally means.
    const actualCurrentPeriod = periods[0];

    const newExpenses = [newExpense, ...actualCurrentPeriod.expenses];

    let newSpend = 0;
    newExpenses.forEach((e) => newSpend += e.amount);

    const newPeriod: SpendPeriod = {...actualCurrentPeriod, expenses: newExpenses, total: newSpend};
    const newPeriods = [...periods];
    newPeriods[0] = newPeriod;
    setPeriods(newPeriods);
    setCurrentPeriodIndex(0);
    setCurrentPeriod(newPeriod);
    setSpent(newSpend);
    setTrySave(true);
  };

  const onDeleteExpense = (newPeriod: SpendPeriod, newSpend: number) =>{
    const newPeriods = [...periods];
    newPeriods[currentPeriodIndex] = newPeriod;
    setPeriods(newPeriods);
    setCurrentPeriod(newPeriod);
    setSpent(newSpend);
    setTrySave(true);
  };

  const onExcludeExpense = (period: SpendPeriod, newSpend: number) => {
    const newPeriod = {...period};
    const newPeriods = [...periods];
    newPeriods[currentPeriodIndex] = newPeriod;
    setPeriods(newPeriods);
    setCurrentPeriod(newPeriod);
    setSpent(newSpend);
    setTrySave(true);
  };

  const onTrySave = () => {
    setTrySave(true);
  };

  // @ts-ignore
  const onChangePeriodIndex = (idx: number) => {
    setCurrentPeriodIndex(idx);
    setCurrentPeriod(periods[idx]);
  };

  const onEndPeriod = () => {
    // Not the current period that is being display, which is what it normally means.
    const actualCurrentPeriod = periods[0];

    actualCurrentPeriod.end = Date.now();

    const newPeriod: SpendPeriod = {
      expenses: [],
      limit: settings.limits[settings.currency],
      currency: settings.currency,
      start: Date.now(),
      total: 0,
    };

    if (actualCurrentPeriod.expenses.length === 0) {
      // allows reset if there's a bug loading it; plus prevents empty periods
      const inPlacePeriods = [...periods];
      inPlacePeriods[0] = newPeriod;
      setPeriods(inPlacePeriods);
      setCurrentPeriod(newPeriod);
      setCurrentPeriodIndex(0);
      setSpent(0);
      setTrySave(true);
    } else {
      setPeriods([newPeriod, ...periods]);
      setCurrentPeriod(newPeriod);
      setCurrentPeriodIndex(0);
      setSpent(0);
      setTrySave(true);
    }
  };

  const onToggleConversion = () => {
    setToggleConversion(!toggleConversion);
  };

  const previous = () => {
    if (currentPeriodIndex > 0) {
      const newIdx = currentPeriodIndex - 1;
      const newPeriod: SpendPeriod = periods[newIdx];
      setSpent(newPeriod.total);
      setCurrentPeriodIndex(newIdx);
      setCurrentPeriod(newPeriod);
    }
  };

  const next = () => {
    if (currentPeriodIndex < periods.length - 1) {
      const newIdx = currentPeriodIndex + 1;
      const newPeriod: SpendPeriod = periods[newIdx];
      setSpent(newPeriod.total);
      setCurrentPeriodIndex(newIdx);
      setCurrentPeriod(newPeriod);
    }
  };

  /* Components */

  const OverUnder = () => {
    const contStyle: CSS = {
      textAlign: "center"
    };
    const spentStyle: CSS = {
      fontSize: "16px",
      margin: "4px"
    };

    let limit = currentPeriod?.limit ?? settings.limits[settings.currency];
    let displaySpent = spent;
    let allExpensesSpent = 0;
    let showAllExpensesSpent = false;
    let includedSpent = 0;
    currentPeriod.expenses.forEach((e) => {
      allExpensesSpent += e.amount;
      includedSpent += e.excluded ? 0 : e.amount;
      if (e.excluded && !showAllExpensesSpent) {
        showAllExpensesSpent = true;
      }
    });

    if (showAllExpensesSpent) {
      displaySpent = includedSpent;
    }

    if (toggleConversion) {
      limit = usd(limit, currentPeriod.currency);
      displaySpent = usd(displaySpent, currentPeriod.currency);
      if (showAllExpensesSpent) {
        allExpensesSpent = usd(allExpensesSpent, currentPeriod.currency);
      }
    }
    let color = displaySpent >= limit ? 'red' : 'green';
    color = displaySpent >= (limit * WARN_THRESHOLD) && displaySpent < limit ? 'orange' : color;

    let allExpensesColor;
    if (showAllExpensesSpent) {
      if (color !== 'red') {
        allExpensesColor = allExpensesSpent >= limit ? 'red' : 'green';
        allExpensesColor = allExpensesSpent >= (limit * WARN_THRESHOLD) && allExpensesSpent < limit ? 'orange' : allExpensesColor;
      } else {
        allExpensesColor = color;
      }
    }

    const spentNumberStyle: CSS = {
      color,
      fontSize: "28px",
      fontWeight: "bold",
    };

    const limitNumberStyle: CSS = {
      fontSize: "36px",
    };

    const overunderStyle: CSS = {
      color: color !== 'green' ? color : undefined,
      fontSize: "12px",
      margin: "6px"
    };

    /* Local Compute */

    let overunderText =  displaySpent > limit ? 'over' : 'stay under';
    overunderText = displaySpent >= (limit * WARN_THRESHOLD) && displaySpent < limit ? 'stay under!' : overunderText;
    overunderText = displaySpent === limit ? 'at' : overunderText;
    if (currentPeriodIndex > 0) {
      overunderText = displaySpent > limit ? ' went over' : 'stayed under';
      overunderText = displaySpent >= (limit * WARN_THRESHOLD) && displaySpent < limit ? 'got close to' : overunderText;
      overunderText = displaySpent === limit ? 'was at' : overunderText;
    }

    const spentText = currentPeriodIndex === 0 ? 'spent so far' : 'spent';

    let currencyDisplay = currentPeriodIndex === 0 ? settings.currency : currentPeriod.currency;
    if (toggleConversion) {
      currencyDisplay = 'USD';
    }

    const allExpensesSpentContStyle: CSS = {
      margin: "0",
      fontSize: "8px",
      lineHeight: "10px",
    };

    const allExpensesSpentNumberStyle: CSS = {
      fontSize: "10px",
      fontWeight: "bold",
      color: allExpensesColor,
    };

    const allExpensesSpentCurrencyStyle: CSS = {
      fontSize: "8px"
    };

    return (
      <div style={contStyle}>
        <h5 style={spentStyle}>{spentText}</h5>
        <div>
          <span>{currencyDisplay}</span><span style={spentNumberStyle}>{displaySpent}</span>
        </div>
        {showAllExpensesSpent ? <div style={allExpensesSpentContStyle}>(<span style={allExpensesSpentCurrencyStyle}>{currencyDisplay}</span><span style={allExpensesSpentNumberStyle}>{allExpensesSpent}</span>)</div> : null}
        <h6 style={overunderStyle}>{overunderText}</h6>
        <div>
          <span>{currencyDisplay}</span><span style={limitNumberStyle}>{limit}</span>
        </div>
      </div>
    )
  }

  const DataButtons = () => {
    const btnStyle: CSS = {
      marginInline: "6px"
    }
    return (
      <>
        <div>
          <button style={btnStyle} onClick={saveToBrowser}>Force Save</button>
          <button style={btnStyle} onClick={loadFromBrowser}>Load Again</button>
        </div>
        <div>
          <button style={btnStyle} onClick={exportData}>Export</button>
        </div>
      </>
    )
  };

  const onAddPeriodName = (name: string) => {
    currentPeriod.name = name;
    const newPeriod = {...currentPeriod, name};
    const newPeriods = [...periods];
    newPeriods[currentPeriodIndex] = newPeriod;
    setCurrentPeriod(newPeriod);
    setPeriods(newPeriods);
    setTrySave(true);
  };

  const onToggleStats = (val: boolean | null = null) => {
    if (val === true || val === false) {
      setToggleStats(val);
    } else {
      const newVal = !toggleStats;
      setToggleStats(newVal);
    }
  };

  const format = "ddd D MMM, YYYY HH:mm";
  const start = moment(currentPeriod.start).format(format);
  const end = currentPeriod.end ? moment(currentPeriod.end).format(format) : 'now';
  let periodText = `${start} to ${end}`;

  if (currentPeriod.end && moment(currentPeriod.start).isSame(moment(currentPeriod.end), 'day')) {
    periodText = `${start} to ${moment(currentPeriod.end).format("HH:mm")}`;
  }

  const periodTextStyle: CSS = {
    display: "inline-block",
    fontSize: "14px",
    marginInline: "8px",
  };

  const PeriodChanger = () => (
    <div>
      <div>
        <button onClick={previous} disabled={currentPeriodIndex === 0}>{`<`}</button>
        <div style={periodTextStyle}>{periodText}</div>
        <button onClick={next} disabled={currentPeriodIndex === periods.length - 1}>{`>`}</button>
      </div>
      <Description initialShowText={!!currentPeriod.name} description={currentPeriod.name} onAddDescription={onAddPeriodName} label={'+Period Name'}/>
      <SpendPeriod period={currentPeriod} onTrySave={onTrySave} onDeleteExpense={onDeleteExpense} onExcludeExpense={onExcludeExpense} allowDelete={currentPeriodIndex === 0} conversionToggled={toggleConversion}/>
    </div>
  );

  const onActivePeriod = currentPeriodIndex == 0;

  const newPeriodStyle: CSS = {
    marginTop: "16px",
    marginBottom: "8px"
  };

  const containerStyle: CSS = {
    marginBottom: "100px",
    zIndex: 0,
  };

  return (
    <>
      <div style={containerStyle}>
        <OverUnder/>
        <NewExpense onAddExpense={onAddExpense} settings={settings}/>
        <AreYouSure initialButtonLabel={'Start New Spend Period'} onYes={onEndPeriod} containerStyle={newPeriodStyle}/>
        <PeriodChanger/>
        {onActivePeriod ? <Settings initial={settings} onChangeSettings={onChangeSettings}/> : null}
        <DataButtons/>
      </div>
      {toggleStats ?
        <ModalContext onClickBackground={onToggleStats}>
          <Stats periods={periods} settings={settings} onClose={() => onToggleStats(false)} toggleConversion={toggleConversion} onTrySave={onTrySave}/>
        </ModalContext>
        : null}
      <Toggle onToggle={onToggleStats} icon={'stats'} index={2} isActive={toggleStats}/>
      <Toggle onToggle={onToggleConversion} icon={'currencyConversion'} index={1} isActive={toggleConversion}/>
    </>
  )
}

export default App
