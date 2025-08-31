import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Brand Whisperer
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/audits" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Audits
            </Link>
            <Link 
              to="/reports" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Reports
            </Link>
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4">
            <button className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              New Audit
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
