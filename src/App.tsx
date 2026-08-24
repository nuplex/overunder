import './App.css'
import {type CSSProperties, useState} from "react";
import moment from "moment";

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

type Expense = {
  currency: Currency;
  amount: number;
  timestamp: number;
  description?: string;
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

// AI
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function usd(val: number, currency: Currency): number {
  if (currency === 'USD') {
    return val;
  }
  return Number.parseFloat((val / USDCurrencyConversionMap[currency]).toFixed(2));
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
    const style: Partial<CSSProperties> = {
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

    const inputStyle: Partial<CSSProperties> = {
      fontSize: '18px',
      height: '24px',
      width: '80px',
    };

    const divStyle: Partial<CSSProperties> = {
      marginBlock: '8px'
    };

    return (
      <div style={divStyle}>
        <label>
          {currency} Limit:&nbsp;
          <input style={inputStyle} type="number" value={val}
                 onBlur={() => onChangeLimitSettings(currency, val)}
                 onChange={(e) => setVal(parseInt(e.target.value))}/>
        </label>
      </div>
    );
  };

  const contStyle: Partial<CSSProperties> = {
    marginBlock: "12px"
  };

  return (
    <div style={contStyle}>
      {CURRENCIES.map((c, i) => <CurrencyBadge key={`cb${i}`} currency={c}/>)}
      {CURRENCIES.map((c, i) => <LimitInput key={`cl${i}`} currency={c}/>)}
    </div>
  )
}

const NewExpense = ({
  onAddExpense,
  settings
}:{
  onAddExpense: ({}: any) => void;
  settings: Settings;
}) => {
  const [expense, setExpense] = useState(0);

  const inputStyle: Partial<CSSProperties> = {
    border: "none",
    borderBottom: "2px solid #333",
    fontSize: "36px",
    lineHeight: "36px",
    width: "150px",
  };

  const buttonStyle: Partial<CSSProperties> = {
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
    const newVal = parseInt(e.target.value);
    setExpense(newVal);
  }

  return (
    <div>
      <span>{settings.currency}</span>
      <input key="newExpenseInput" style={inputStyle} type="number" placeholder={`What's new`} value={expense} onChange={onChangeExpense}/>
      <button style={buttonStyle} onClick={onAddExpenseLocal}>+</button>
    </div>
  );
};

const Description = ({
  initialShowText,
  description,
  onAddDescription,
  label = '+Desc',
}:{
  initialShowText: boolean;
  description?: string;
  onAddDescription: ({}: any) => void;
  label?: string;
}) => {
  const [text, setText] = useState(description);
  const [showText, setShowText] = useState(initialShowText);
  const [editing, setEditing] = useState(false);

  const textStyle: Partial<CSSProperties> = {
    fontSize: "12px"
  };

  const onClickText = () => {
    setShowText(false);
    setEditing(true);
  }

  if (text && showText && !editing) {
    return (
      <div style={textStyle} onClick={onClickText} >
        {description}
      </div>
    )
  }
  
  const onClickEdit = () => {
    setShowText(true);
    setEditing(true);
  }

  if (((!showText || !text) || (showText && !text)) && !editing) {
    return (
      <div>
        <button onClick={onClickEdit}>{label}</button>
      </div>
    )
  }

  const onAdd = () => {
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

const ViewExpense = ({
  exp,
  setTrySave,
  onDeleteExpense,
  allowDelete,
  conversionToggled,
}: {
  exp: Expense;
  setTrySave: ({}: any) => void;
  onDeleteExpense: ({}: any) => void;
  allowDelete: boolean;
  conversionToggled: boolean;
}) => {
  const [desc, setDesc] = useState(exp.description);

  const contStyle: Partial<CSSProperties> = {
    marginBlock: "10px",
  };

  const currencyStyle: Partial<CSSProperties> = {
    fontSize: "12px",
  };

  const timeStyle: Partial<CSSProperties> = {
    fontSize: "12px",
    lineHeight: "12px",
    marginTop: "4px",
  };

  const onAddDescription = (text: string) => {
    if (text !== undefined) {
      exp.description = text;
      setDesc(text);
      setTrySave(true);
    }
  };

  const amount = conversionToggled ? usd(exp.amount, exp.currency) : exp.amount;
  const currency: Currency = conversionToggled ? 'USD' : exp.currency;

  return (
    <div style={contStyle}>
      <span style={currencyStyle}>{currency}</span><span>{amount}</span>
      <p style={timeStyle}>{formatTimestamp(exp.timestamp)}</p>
      <Description initialShowText={!!desc} description={desc} onAddDescription={onAddDescription}/>
      {allowDelete ? <button onClick={() => onDeleteExpense(exp.timestamp)}>Delete</button> : null}
    </div>
  )
};

function SpendPeriod({
  period,
  onTrySave,
  onDeleteExpense,
  // @ts-ignore
  isMultiCurrency = false,
  allowDelete,
  conversionToggled,
}: {
  period: SpendPeriod;
  onTrySave: () => void;
  onDeleteExpense: ({}: any, {}: any) => void;
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
    //setExpenses(newExpenses);
    onDeleteExpense(newPeriod, newSpend);
    //onTrySave();
  }

  return (
    <div>
      {period.expenses.map((e, i) => <ViewExpense key={`${e.timestamp}${i}`} exp={e} setTrySave={onTrySave} onDeleteExpense={onDeleteExpenseInPeriod} allowDelete={allowDelete} conversionToggled={conversionToggled}/>)}
    </div>
  );
}

const Toggle = ({onToggle, label, index, isActive}:{onToggle: () => void, label: string, index: number, isActive: boolean}) => {
  const fromBottom = 24 * index;
  const background = isActive ? "rgba(255,215,0,0.95)" : "rgba(0,0,0,0.05)";
  const textColor = isActive ? "#333" : undefined;

  const toggleStyle: Partial<CSSProperties> = {
    background,
    position: "fixed",
    bottom: fromBottom,
    right: 24,
    border: "none",
    borderRadius: "50px",
    width: "48px",
    height: "48px",
    marginBlock: "4px",
    lineHeight: "48px",
    fontSize: "22px",
    fontWeight: "bolder",
    color: textColor,
    cursor: "pointer",
  };

  return (
    <div style={toggleStyle} onClick={onToggle}>
      {label}
    </div>
  );
}

const BOILERPLATE_PERIOD: SpendPeriod = {
  expenses: [],
  limit: DEFAULT_SETTINGS.limits['USD'],
  currency: 'USD',
  start: Date.now(),
  total: 0,
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

  const loadFromBrowser = (): SpendPeriod[] | undefined => {
    // TODO remove expensesJson once initial data is put into periods format
    const expensesJson = document.cookie
    .split("; ")
    .find((row) => row.startsWith("expenses="))
    ?.split("=")[1];

    let periodsJson = localStorage.getItem('periods') ?? undefined;
    let settingsJson = localStorage.getItem('settings') ?? undefined;

    // TODO remove cookie retrieval once initial data is gotten from localStorage
    if (!periodsJson) {
      periodsJson = document.cookie
      .split("; ")
      .find((row) => row.startsWith("periods="))
      ?.split("=")[1];
    }

    // TODO remove cookie retrieval once initial data is gotten from localStorage
    if (!settingsJson) {
      settingsJson = document.cookie
      .split("; ")
      .find((row) => row.startsWith("settings="))
      ?.split("=")[1];
    }


    // TODO remove expensesJson once initial data is put into periods format
    if (expensesJson && !periodsJson) {
      const loadedExpenses = JSON.parse(expensesJson);
      let newSpend = 0;
      loadedExpenses.forEach((e: Expense) => newSpend += e.amount);

      setSpent(newSpend);
    }

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

      // TODO, remove once intial data is wrapped in a period
      if (!periodsJson && expensesJson) {
        const loadedExpenses: Expense[] = JSON.parse(expensesJson);
        const currency = loadedExpenses[0].currency;
        let total = 0;
        loadedExpenses.forEach((e: Expense) => total += e.amount);

        const newPeriod: SpendPeriod = {
          expenses: loadedExpenses,
          limit: settings.limits[currency],
          currency,
          start: loadedExpenses[loadedExpenses.length - 1].timestamp,
          total,
        };

        setPeriods([newPeriod]);
        setCurrentPeriod(newPeriod);

        return [newPeriod];
      }
    }

    if (loaded) return loaded;
  };

  const saveToBrowser = () => {
    // TODO remove cookie storage
    const periodsString = JSON.stringify(periods);
    document.cookie = `periods=${periodsString}; max-age=31536000`;
    const settingsString = JSON.stringify(settings);
    document.cookie = `settings=${settingsString}; max-age=31536000`;

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
  }

  const onDeleteExpense = (newPeriod: SpendPeriod, newSpend: number) =>{
    const newPeriods = [...periods];
    newPeriods[currentPeriodIndex] = newPeriod;
    setPeriods(newPeriods);
    setCurrentPeriod(newPeriod);
    setSpent(newSpend);
    setTrySave(true);
  }

  const onTrySave = () => {
    setTrySave(true);
  }

  // @ts-ignore
  const onChangePeriodIndex = (idx: number) => {
    setCurrentPeriodIndex(idx);
    setCurrentPeriod(periods[idx]);
  }

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
  }

  const onToggleConversion = () => {
    setToggleConversion(!toggleConversion);
  }

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
    const contStyle: Partial<CSSProperties> = {
      textAlign: "center"
    }
    const spentStyle: Partial<CSSProperties> = {
      fontSize: "16px",
      margin: "4px"
    };

    let limit = currentPeriod?.limit ?? settings.limits[settings.currency];
    let displaySpent = spent;
    if (toggleConversion) {
      limit = usd(limit, currentPeriod.currency);
      displaySpent = usd(displaySpent, currentPeriod.currency);
    }
    let color = displaySpent >= limit ? 'red' : 'green';
    color = displaySpent >= (limit * WARN_THRESHOLD) && displaySpent < limit ? 'orange' : color;
    const spentNumberStyle: Partial<CSSProperties> = {
      color,
      fontSize: "28px",
      fontWeight: "bold",
    };

    const limitNumberStyle: Partial<CSSProperties> = {
      fontSize: "36px",
    };

    const overunderStyle: Partial<CSSProperties> = {
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

    return (
      <div style={contStyle}>
        <h5 style={spentStyle}>{spentText}</h5>
        <div>
          <span>{currencyDisplay}</span><span style={spentNumberStyle}>{displaySpent}</span>
        </div>
        <h6 style={overunderStyle}>{overunderText}</h6>
        <div>
          <span>{currencyDisplay}</span><span style={limitNumberStyle}>{limit}</span>
        </div>
      </div>
    )
  }

  const DataButtons = () => {
    const btnStyle: Partial<CSSProperties> = {
      marginInline: "6px"
    }
    return (
      <div>
        <button style={btnStyle} onClick={saveToBrowser}>Force Save</button>
        <button style={btnStyle} onClick={loadFromBrowser}>Load Again</button>
      </div>
    )
  }

  const newPeriodStyle: Partial<CSSProperties> = {
    marginTop: "16px",
    marginBottom: "8px"
  }

  const NewPeriodButton = () => {
    const [showAreYouSure, setShowAreYouSure] = useState(false);

    const onInitialClick = () => setShowAreYouSure(true);

    const textStyle: Partial<CSSProperties> = {
      fontSize: "14px"
    };

    // TODO this can just be made into a generic component
    const AreYouSure = () => (
      <div>
        <span style={textStyle}>Are you sure?</span>&nbsp;
        <button onClick={onEndPeriod}>Yes</button>&nbsp;
        <button onClick={() => setShowAreYouSure(false)}>No</button>
      </div>
    );

    return (
      <div style={newPeriodStyle}>
        {!showAreYouSure ? <button onClick={onInitialClick}>Start New Spend Period</button> : null}
        {showAreYouSure ? <AreYouSure/> : null}
      </div>
    );
  };

  const onAddPeriodName = (name: string) => {
    currentPeriod.name = name;
    const newPeriod = {...currentPeriod, name};
    const newPeriods = [...periods];
    newPeriods[currentPeriodIndex] = newPeriod;
    setCurrentPeriod(newPeriod);
    setPeriods(newPeriods);
    setTrySave(true);
  }

  const format = "ddd D MMM, YYYY HH:mm";
  const start = moment(currentPeriod.start).format(format);
  const end = currentPeriod.end ? moment(currentPeriod.end).format(format) : 'now';
  let periodText = `${start} to ${end}`;

  if (currentPeriod.end && moment(currentPeriod.start).isSame(moment(currentPeriod.end), 'day')) {
    periodText = `${start} to ${moment(currentPeriod.end).format("HH:mm")}`;
  }

  const periodTextStyle: Partial<CSSProperties> = {
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
      <SpendPeriod period={currentPeriod} onTrySave={onTrySave} onDeleteExpense={onDeleteExpense} allowDelete={currentPeriodIndex === 0} conversionToggled={toggleConversion}/>
    </div>
  );

  const onActivePeriod = currentPeriodIndex == 0;

  const containerStyle: Partial<CSSProperties> = {
    marginBottom: "100px",
  }

  return (
    <div style={containerStyle}>
      <OverUnder/>
      <NewExpense onAddExpense={onAddExpense} settings={settings}/>
      <NewPeriodButton/>
      <PeriodChanger/>
      {onActivePeriod ? <Settings initial={settings} onChangeSettings={onChangeSettings}/> : null}
      <DataButtons/>
      <Toggle onToggle={onToggleConversion} label={'$'} index={1} isActive={toggleConversion}/>
    </div>
  )
}

export default App
