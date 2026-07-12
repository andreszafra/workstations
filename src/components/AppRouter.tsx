import { useEffect, useState } from 'react';
import ReadOnlySiteView from './ReadOnlySiteView';
import ReadOnlyCompanyView from './ReadOnlyCompanyView';
import App from '../App';

export default function AppRouter() {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [viewType, setViewType] = useState<'site' | 'company' | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const readonly = params.get('readonly');
    const site = params.get('site');
    const company = params.get('company');

    if (readonly === 'true') {
      setIsReadOnly(true);
      if (site) {
        setViewType('site');
        setSiteId(site);
      } else if (company === 'true') {
        setViewType('company');
      }
    }
  }, []);

  if (isReadOnly) {
    if (viewType === 'site' && siteId) {
      return <ReadOnlySiteView siteId={siteId} />;
    }
    if (viewType === 'company') {
      return <ReadOnlyCompanyView />;
    }
  }

  return <App />;
}
