import Navbar from './Navbar';
import Footer from '../shared/Footer';
import SkipLink, { MAIN_CONTENT_ID } from '../shared/SkipLink';
import DropOpenedModal from '../../ui/DropOpenedModal';

const PublicLayout = ({ children, showNewsletter = true }) => {
  return (
    <div className="flex min-h-screen flex-col bg-white text-shio-gray">
      <SkipLink />
      <Navbar />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className={`flex-grow ${showNewsletter ? 'pb-24' : ''}`}>
        {children}
      </main>
      <Footer showNewsletter={showNewsletter} />
      <DropOpenedModal />
    </div>
  );
};

export default PublicLayout;
