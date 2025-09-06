import { createContext, useContext, useMemo, useReducer } from 'react';

const SearchResultsContext = createContext(null);

const initialResultsState = {
  results: [],      // [{ location, temps }]
  loading: false,
  error: '',
};

export const ResultsAction = {
  SET_RESULTS: 'SET_RESULTS',
  APPEND_RESULTS: 'APPEND_RESULTS',
  CLEAR: 'CLEAR',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

function resultsReducer(state, action) {
  switch (action.type) {
    case ResultsAction.SET_RESULTS:
      return { ...state, results: action.payload, loading: false, error: '' };
    case ResultsAction.APPEND_RESULTS:
      return { ...state, results: [...state.results, ...action.payload], loading: false, error: '' };
    case ResultsAction.CLEAR:
      return { ...state, results: [], error: '' };
    case ResultsAction.SET_LOADING:
      return { ...state, loading: action.payload };
    case ResultsAction.SET_ERROR:
      return { ...state, error: action.payload, loading: false, results: [] };
    default:
      return state;
  }
}

export function SearchResultsProvider({ children }) {
  const [state, dispatch] = useReducer(resultsReducer, initialResultsState);

  const actions = useMemo(() => ({
    setResults: (arr) => dispatch({ type: ResultsAction.SET_RESULTS, payload: arr }),
    appendResults: (arr) => dispatch({ type: ResultsAction.APPEND_RESULTS, payload: arr }),
    clear: () => dispatch({ type: ResultsAction.CLEAR }),
    setLoading: (b) => dispatch({ type: ResultsAction.SET_LOADING, payload: b }),
    setError: (msg) => dispatch({ type: ResultsAction.SET_ERROR, payload: msg }),
  }), []);

  return (
    <SearchResultsContext.Provider value={{ state, actions }}>
      {children}
    </SearchResultsContext.Provider>
  );
}

export function useSearchResults() {
  const ctx = useContext(SearchResultsContext);
  if (!ctx) throw new Error('useSearchResults debe usarse dentro de <SearchResultsProvider>');
  return ctx;
}
