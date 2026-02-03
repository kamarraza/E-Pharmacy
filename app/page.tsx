export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">Welcome to E-Pharmacy</h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8">Your trusted mediator between patients and pharmacies</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            <a href="/upload" className="bg-white text-blue-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 text-center">
              Upload Prescription
            </a>
            <a href="/pharmacies" className="bg-white text-blue-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 text-center">
              Find Pharmacies
            </a>
            <a href="/subscribe" className="bg-white text-blue-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 text-center">
              Pharmacist Subscribe
            </a>
            <a href="/dashboard" className="bg-white text-blue-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 text-center">
              Dashboard
            </a>
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Features</h2>
          <p className="text-lg text-gray-600">Discover how we connect patients with pharmacies seamlessly</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-lg mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Prescription Upload</h3>
              <p className="text-gray-600">Easy and secure patient interface for uploading prescriptions</p>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pharmacist Dashboard</h3>
              <p className="text-gray-600">Manage and fulfill prescriptions efficiently</p>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location-Based</h3>
              <p className="text-gray-600">Find nearby pharmacy services quickly</p>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mediator Role</h3>
              <p className="text-gray-600">Connecting patients and pharmacies seamlessly</p>
            </div>
          </div>
        </div>
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Subscription Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly Plan</h3>
                <p className="text-3xl font-bold text-blue-600 mb-4">$29<span className="text-lg font-normal">/month</span></p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to prescriptions
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic dashboard
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Email support
                  </li>
                </ul>
                <a href="/subscribe" className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition duration-300 text-center block">
                  Choose Plan
                </a>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300 border-2 border-blue-500 relative">
              <div className="bg-blue-500 text-white text-center py-2 text-sm font-semibold">
                Most Popular
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Yearly Plan</h3>
                <p className="text-3xl font-bold text-blue-600 mb-4">$299<span className="text-lg font-normal">/year</span></p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All monthly features
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Priority matching
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Phone support
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save 20%
                  </li>
                </ul>
                <a href="/subscribe" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition duration-300 text-center block">
                  Choose Plan
                </a>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium Plan</h3>
                <p className="text-3xl font-bold text-blue-600 mb-4">$499<span className="text-lg font-normal">/year</span></p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All yearly features
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Advanced analytics
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated account manager
                  </li>
                  <li className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Custom integrations
                  </li>
                </ul>
                <a href="/subscribe" className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold transition duration-300 text-center block">
                  Choose Plan
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About Our E-Pharmacy</h2>
          <p className="text-gray-600 mb-6">
            We are the mediator between patients and pharmacies, providing a seamless platform for prescription fulfillment.
            Patients can easily upload their prescriptions, and nearby subscribed pharmacies can view and process them efficiently.
            Our location-based system ensures quick and reliable service.
          </p>
          <div className="flex flex-wrap justify-center space-x-4">
            <a href="/upload" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mb-2">
              Get Started
            </a>
            <a href="/pharmacies" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 mb-2">
              Find Pharmacies
            </a>
          </div>
        </div>
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Patient John</h4>
                  <p className="text-gray-600 text-sm">Regular User</p>
                </div>
              </div>
              <p className="text-gray-600">"This platform made getting my prescriptions filled so much easier. No more waiting in long lines!"</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">D</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Dr. Smith</h4>
                  <p className="text-gray-600 text-sm">Pharmacist</p>
                </div>
              </div>
              <p className="text-gray-600">"As a pharmacist, this system helps me manage prescriptions efficiently and reach more patients."</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Mary Johnson</h4>
                  <p className="text-gray-600 text-sm">Patient</p>
                </div>
              </div>
              <p className="text-gray-600">"The location-based matching is fantastic. I always find a pharmacy near me quickly."</p>
            </div>
          </div>
        </div>
        <div className="mt-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">Join our growing community of patients and pharmacies</p>
          <div className="flex flex-wrap justify-center space-x-4">
            <a href="/upload" className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 mb-2">
              Upload Your Prescription
            </a>
            <a href="/subscribe" className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition duration-300 mb-2">
              Become a Pharmacist
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
