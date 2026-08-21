import './App.css'
import {type CSSProperties, useState} from "react";

const WARN_THRESHOLD = 0.80;

const CURRENCIES = ['USD', 'HKD', 'SGD', 'NTD', 'JPY'] as const;
type Currency = typeof CURRENCIES[number];

type Expense = {
  currency: Currency;
  amount: number;
  timestamp: number;
  description?: string;
}

// @ts-ignore
type Day = {
  expenses: Expense[];
  limit: number;
  total: number;
}

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
  }
};

// AI
function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
          <input style={inputStyle} type="number" value={limits[currency]}
                 onChange={(e) => onChangeLimitSettings(currency, parseInt(e.target.value))}/>
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
    fontSize: "36px"
  };

  const onAddExpenseLocal = () => {
    if(Number.isNaN(expense) || expense === 0) {
      return;
    }
    onAddExpense(expense);
    setExpense(0);
  }

  return (
    <div>
      <span>{settings.currency}</span>
      <input key="newEpenseInput" style={inputStyle} type="number" placeholder={`What's new?`} value={expense} onChange={(e: any) => setExpense(parseInt(e.target.value))}/>
      <button style={buttonStyle} onClick={onAddExpenseLocal}>+</button>
    </div>
  );
};

const Description = ({
  initialShowText,
  description,
  onAddDescription
}:{
  initialShowText: boolean;
  description?: string;
  onAddDescription: ({}: any) => void;
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
        <button onClick={onClickEdit}>+Desc</button>
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

function App() {
  const [spent, setSpent] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // @ts-ignore
  const [days, setDays] = useState([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [triedLoad, setTriedLoad] = useState(false);
  const [trySave, setTrySave] = useState(false);

  const loadFromBrowser = () => {
    const expensesJson = document.cookie
    .split("; ")
    .find((row) => row.startsWith("expenses="))
    ?.split("=")[1];

    const settingsJson = document.cookie
    .split("; ")
    .find((row) => row.startsWith("settings="))
    ?.split("=")[1];

    if (expensesJson) {
      const newExpenses = JSON.parse(expensesJson as string);
      let newSpend = 0;
      newExpenses.forEach((e: Expense) => newSpend += e.amount);

      setExpenses(newExpenses);
      setSpent(newSpend);
    }

    if (settingsJson) {
      setSettings(JSON.parse(settingsJson));
    }
  };

  const saveToBrowser = () => {
    const expensesString = JSON.stringify(expenses);
    document.cookie = `expenses=${expensesString}; max-age=31536000`;
    const settingsString = JSON.stringify(settings);
    document.cookie = `settings=${settingsString}; max-age=31536000`;
  }

  if (!triedLoad) {
    loadFromBrowser();
    setTriedLoad(true);
  }

  if (trySave) {
    saveToBrowser();
    setTrySave(false);
  }

  const onChangeSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setTrySave(true);
  }

  const onAddExpense = (value: number) => {
    if (value === 0) {
      return;
    }

    const newExpense: Expense = {
      currency: settings.currency,
      amount: value,
      timestamp: Date.now(),
    }

    const newExpenses = [newExpense, ...expenses];

    let newSpend = 0;
    newExpenses.forEach((e) => newSpend += e.amount);

    setExpenses(newExpenses);
    setSpent(newSpend);
    setTrySave(true);
  }

  const onDeleteExpense = (timestamp: number) => {
    const newExpenses = expenses.filter(e => e.timestamp != timestamp);

    let newSpend = 0;
    newExpenses.forEach((e) => newSpend += e.amount);

    setExpenses(newExpenses);
    setSpent(newSpend);
    setTrySave(true);
  }

  const OverUnder = () => {
    const contStyle: Partial<CSSProperties> = {
      textAlign: "center"
    }
    const spentStyle: Partial<CSSProperties> = {
      fontSize: "16px",
      margin: "4px"
    };

    const limit = settings.limits[settings.currency];
    let color = spent >= limit ? 'red' : 'green';
    color = spent >= (limit * WARN_THRESHOLD) && spent < limit ? 'orange' : color;
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

    let overunderText =  spent > limit ? 'over' : 'stay under';
    overunderText = spent >= (limit * WARN_THRESHOLD) && spent < limit ? 'stay under!' : overunderText;
    overunderText = spent === limit ? 'at' : overunderText;

    return (
      <div style={contStyle}>
        <h5 style={spentStyle}>spent so far</h5>
        <div>
          <span>{settings.currency}</span><span style={spentNumberStyle}>{spent}</span>
        </div>
        <h6 style={overunderStyle}>{overunderText}</h6>
        <div>
          <span>{settings.currency}</span><span style={limitNumberStyle}>{limit}</span>
        </div>
      </div>
    )
  }

  const ViewExpense = ({exp}: {exp: Expense}) => {
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
    }

    return (
      <div style={contStyle}>
        <span style={currencyStyle}>{exp.currency}</span><span>{exp.amount}</span>
        <p style={timeStyle}>{formatTimestamp(exp.timestamp)}</p>
        <Description initialShowText={!!desc} description={desc} onAddDescription={onAddDescription}/>
        <button onClick={() => onDeleteExpense(exp.timestamp)}>Delete</button>
      </div>
    )
  };

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

  return (
    <div>
      <OverUnder/>
      <NewExpense onAddExpense={onAddExpense} settings={settings}/>
      {expenses.map((e, i) => <ViewExpense key={`${e.timestamp}${i}`} exp={e}/>)}
      <Settings initial={settings} onChangeSettings={onChangeSettings}/>
      <DataButtons/>
    </div>
  )
}

export default App
