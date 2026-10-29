import AdminNavbar from './AdminNavbar';
import Footer from '../shared/Footer';
import SkipLink, { MAIN_CONTENT_ID } from '../shared/SkipLink';

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white font-inter text-black">
      <SkipLink />
      <AdminNavbar />
      <div className="lg:pl-[240px]">
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="border-b border-black/10 px-4 py-6 md:px-14 md:py-12">
          {children}
        </main>
        <Footer showNewsletter={false} />
      </div>
    </div>
  );
};

export default AdminLayout;
