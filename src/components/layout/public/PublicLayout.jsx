import Navbar from './Navbar';
import Footer from '../shared/Footer';
import DropOpenedModal from '../../ui/DropOpenedModal';

const PublicLayout = ({ children, showNewsletter = true }) => {
  return (
    <div className="flex min-h-screen flex-col bg-white text-shio-gray">
      <Navbar />
      <main className={`flex-grow ${showNewsletter ? 'pb-24' : ''}`}>
        {children}
      </main>
      <Footer showNewsletter={showNewsletter} />
      <DropOpenedModal />
    </div>
  );
};

export default PublicLayout;
