import getPharmacyModel from '@/models/Pharmacy';
import getPharmacistUserModel from '@/models/PharmacistUser';

const samplePharmacies = [
  {
    name: 'City Pharmacy Plus',
    email: 'citypharmacy@example.com',
    phone: '+91-9876543210',
    address: '123 MG Road, Connaught Place, New Delhi, Delhi 110001',
    location: 'New Delhi',
    coordinates: { lat: 28.6304, lng: 77.2177 },
    supportsPrescriptionUpload: true,
    isUsingService: true,
    subscriptionType: 'premium',
    rating: 4.8,
    reviewCount: 156,
    services: ['24/7 Service', 'Home Delivery', 'Online Consultation'],
    operatingHours: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      wednesday: { open: '09:00', close: '22:00' },
      thursday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '22:00' },
      saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '10:00', close: '18:00' }
    }
  },
  {
    name: 'HealthCare Pharmacy',
    email: 'healthcare@example.com',
    phone: '+91-9876543211',
    address: '456 Karol Bagh, New Delhi, Delhi 110005',
    location: 'New Delhi',
    coordinates: { lat: 28.6517, lng: 77.1925 },
    supportsPrescriptionUpload: true,
    isUsingService: true,
    subscriptionType: 'yearly',
    rating: 4.6,
    reviewCount: 89,
    services: ['Home Delivery', 'Insurance Claims'],
    operatingHours: {
      monday: { open: '08:00', close: '21:00' },
      tuesday: { open: '08:00', close: '21:00' },
      wednesday: { open: '08:00', close: '21:00' },
      thursday: { open: '08:00', close: '21:00' },
      friday: { open: '08:00', close: '21:00' },
      saturday: { open: '09:00', close: '19:00' },
      sunday: { open: '10:00', close: '17:00' }
    }
  },
  {
    name: 'MediCare Pharmacy',
    email: 'medicare@example.com',
    phone: '+91-9876543212',
    address: '789 Lajpat Nagar, New Delhi, Delhi 110024',
    location: 'New Delhi',
    coordinates: { lat: 28.5789, lng: 77.2401 },
    supportsPrescriptionUpload: false,
    isUsingService: false,
    subscriptionType: null,
    rating: 4.2,
    reviewCount: 45,
    services: ['Basic Pharmacy Services'],
    operatingHours: {
      monday: { open: '09:00', close: '20:00' },
      tuesday: { open: '09:00', close: '20:00' },
      wednesday: { open: '09:00', close: '20:00' },
      thursday: { open: '09:00', close: '20:00' },
      friday: { open: '09:00', close: '20:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { open: 'Closed', close: 'Closed' }
    }
  },
  {
    name: 'Wellness Pharmacy',
    email: 'wellness@example.com',
    phone: '+91-9876543213',
    address: '321 South Extension, New Delhi, Delhi 110049',
    location: 'New Delhi',
    coordinates: { lat: 28.5689, lng: 77.2201 },
    supportsPrescriptionUpload: true,
    isUsingService: false,
    subscriptionType: null,
    rating: 4.4,
    reviewCount: 67,
    services: ['Home Delivery', 'Health Check-ups'],
    operatingHours: {
      monday: { open: '08:30', close: '22:00' },
      tuesday: { open: '08:30', close: '22:00' },
      wednesday: { open: '08:30', close: '22:00' },
      thursday: { open: '08:30', close: '22:00' },
      friday: { open: '08:30', close: '22:00' },
      saturday: { open: '09:00', close: '21:00' },
      sunday: { open: '10:00', close: '19:00' }
    }
  },
  {
    name: 'QuickMeds Pharmacy',
    email: 'quickmeds@example.com',
    phone: '+91-9876543214',
    address: '654 Rajouri Garden, New Delhi, Delhi 110027',
    location: 'New Delhi',
    coordinates: { lat: 28.6475, lng: 77.1234 },
    supportsPrescriptionUpload: false,
    isUsingService: true,
    subscriptionType: 'monthly',
    rating: 4.0,
    reviewCount: 23,
    services: ['Express Delivery', 'Online Ordering'],
    operatingHours: {
      monday: { open: '07:00', close: '23:00' },
      tuesday: { open: '07:00', close: '23:00' },
      wednesday: { open: '07:00', close: '23:00' },
      thursday: { open: '07:00', close: '23:00' },
      friday: { open: '07:00', close: '23:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '09:00', close: '20:00' }
    }
  }
];

export async function seedPharmacies() {
  try {
    const PharmacyModel = await getPharmacyModel();
    const PharmacistUserModel = await getPharmacistUserModel();

    for (const pharmacyData of samplePharmacies) {
      // Create a corresponding pharmacist user
      const pharmacistUser = new PharmacistUserModel({
        name: pharmacyData.name,
        email: pharmacyData.email,
        password: '$2a$10$hashedpassword', // This would be properly hashed in real implementation
        role: 'pharmacist',
        phone: pharmacyData.phone,
        address: pharmacyData.address,
        location: pharmacyData.location,
        subscriptionType: pharmacyData.subscriptionType,
        subscriptionStart: pharmacyData.isUsingService ? new Date() : null,
        subscriptionEnd: pharmacyData.isUsingService ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      });

      await pharmacistUser.save();

      // Create pharmacy entry
      const pharmacy = new PharmacyModel({
        ...pharmacyData,
        pharmacistId: pharmacistUser._id,
      });

      await pharmacy.save();
      console.log(`Created pharmacy: ${pharmacyData.name}`);
    }

    console.log('Sample pharmacies seeded successfully!');
  } catch (error) {
    console.error('Error seeding pharmacies:', error);
  }
}