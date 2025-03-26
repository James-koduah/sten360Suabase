import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, Users, ClipboardList, DollarSign, 
  FileSpreadsheet, MessageSquare, Shield, UserSquare2,
  Package, ShoppingCart, BarChart4, Scissors,
  ArrowRight, CheckCircle
} from 'lucide-react';

const industries = [
  {
    icon: Scissors,
    name: 'Fashion & Tailoring',
    description: 'Perfect for fashion houses, tailoring shops, and clothing manufacturers.'
  },
  {
    icon: Package,
    name: 'Service-Based Businesses',
    description: 'Ideal for businesses offering services like cleaning, repairs, or installations.'
  },
  {
    icon: Users,
    name: 'Contractors & Freelancers',
    description: 'Great for managing contract workers, freelancers, and project-based teams.'
  },
  {
    icon: ShoppingCart,
    name: 'Retail & Custom Orders',
    description: 'Suitable for retail businesses handling custom orders and made-to-order products.'
  }
];

const features = [
  {
    icon: Users,
    title: 'Workforce Management',
    description: 'Track workers, assign tasks, and manage project rates with WhatsApp integration.'
  },
  {
    icon: UserSquare2,
    title: 'Client Management',
    description: 'Maintain client profiles with custom fields and track client-specific information.'
  },
  {
    icon: Package,
    title: 'Service Catalog',
    description: 'Define and price your services, create service packages, and track service delivery.'
  },
  {
    icon: ShoppingCart,
    title: 'Order Management',
    description: 'Process client orders, assign workers, and track order fulfillment end-to-end.'
  },
  {
    icon: ClipboardList,
    title: 'Task & Project Tracking',
    description: 'Monitor tasks, track progress, and manage project timelines efficiently.'
  },
  {
    icon: FileSpreadsheet,
    title: 'Detailed Reports',
    description: 'Export financial reports, worker performance, and order analytics in Excel/PDF.'
  },
  {
    icon: DollarSign,
    title: 'Financial Controls',
    description: 'Track earnings, manage deductions, and monitor financial performance.'
  },
  {
    icon: MessageSquare,
    title: 'Communication',
    description: 'Integrated WhatsApp messaging for seamless communication.'
  },
  {
    icon: BarChart4,
    title: 'Business Analytics',
    description: 'Get insights into your business performance, worker productivity, and client trends.'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with role-based access control and data protection.'
  }
];

const benefits = [
  {
    title: 'Save Time',
    description: 'Streamline operations and reduce administrative overhead with automated workflows.'
  },
  {
    title: 'Grow Revenue',
    description: 'Manage more clients, track orders efficiently, and increase business throughput.'
  },
  {
    title: 'Better Insights',
    description: 'Make data-driven decisions with comprehensive business analytics and reporting.'
  },
  {
    title: 'Improve Client Satisfaction',
    description: 'Deliver better service with organized client management and order tracking.'
  }
];

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 transform -skew-y-6 origin-top-left" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pb-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Building2 className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Sten360: <span className="text-blue-600">Business Management</span> Platform
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
              A Sten Business solution for managing your entire operation - from clients and orders to workers 
              and finances - all in one integrated platform. Built for growing organizations that demand efficiency.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/signin"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Industries Section */}
      <div className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Industries We Serve
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Our platform is tailored for businesses that rely on skilled workers and custom orders
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="relative bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <span className="flex-shrink-0 rounded-lg inline-flex p-3 bg-blue-50 text-blue-600">
                    <industry.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {industry.name}
                    </h3>
                    <p className="mt-2 text-base text-gray-500">
                      {industry.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Your All-in-One Business Solution
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Powerful features designed to help you manage and grow your business efficiently
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:shadow-lg transition-shadow duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600 ring-4 ring-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Transform Your Business Operations
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Streamline operations, boost efficiency, and accelerate growth with our integrated platform
            </p>
          </div>

          <div className="mt-20">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-12">
              {benefits.map((benefit, index) => (
                <div key={index} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{benefit.title}</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">{benefit.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Success Story Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 sm:p-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8 text-center">
                How Kofi Ghana Kloding Scaled with Sten360
              </h2>
              
              <p className="text-gray-600 mb-8">
                Before switching to Sten360, Kofi Ghana Kloding struggled with disorganized client records, 
                delayed orders, and inefficient workforce management. Manual processes made it difficult to 
                track tailor assignments, manage finances, and keep up with growing customer demand.
              </p>

              <p className="text-lg font-semibold text-gray-900 mb-6">
                With Sten360, Kofi Ghana Kloding transformed its operations:
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Seamless Order & Client Management</p>
                    <p className="text-gray-600">Orders are tracked end-to-end, ensuring every client gets timely service.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Workforce Efficiency</p>
                    <p className="text-gray-600">Tailors receive assignments instantly, and their progress is monitored in real-time.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Smarter Financial Controls</p>
                    <p className="text-gray-600">Earnings, expenses, and worker payments are automatically tracked, reducing financial errors.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Stronger Customer Relationships</p>
                    <p className="text-gray-600">With detailed client profiles and history, Kofi delivers a more personalized experience.</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-center mb-8">
                Now, Kofi Ghana spends less time handling admin tasks and more time growing his brand.
              </p>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Ready to take your business to the next level?
                </h3>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Get Started with Sten360 Today!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-lg shadow-xl overflow-hidden">
            <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
              <div className="lg:self-center">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Ready to get started?</span>
                  <span className="block">Transform your business today.</span>
                </h2>
                <p className="mt-4 text-lg leading-6 text-blue-200">
                  Sign up for free and experience the difference. No credit card required.
                </p>
                <Link
                  to="/signup"
                  className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center mb-2">
              <Building2 className="h-6 w-6 text-gray-400" />
              <span className="ml-2 text-gray-500">© 2024 Sten Media Network. All rights reserved.</span>
            </div>
            <p className="text-sm text-gray-400">
              Sten360 is a product of Sten Business, a subsidiary of Sten Media Network
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}