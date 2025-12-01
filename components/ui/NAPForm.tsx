
import React, { useState, useEffect } from 'react';
import { NAPData, OfficeLocation } from '../../types';
import { Input } from './Input';
import { Label } from './Label';
import { Button } from './Button';
import { Card } from './Card';
import { v4 as uuidv4 } from 'uuid';

interface NAPFormProps {
  initialData?: Partial<NAPData>;
  onSave: (data: NAPData) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  showCancelButton?: boolean;
  compactMode?: boolean;
}

const EMPTY_LOCATION: Omit<OfficeLocation, 'id'> = {
  name: '',
  is_headquarters: false,
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
};

export const NAPForm: React.FC<NAPFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  showCancelButton = false,
  compactMode = false
}) => {
  const [formData, setFormData] = useState<NAPData>({
    company_name: initialData?.company_name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    founded_year: initialData?.founded_year || '',
    locations: initialData?.locations || []
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NAPData, string>>>({});
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        locations: initialData.locations || []
      }));
    }
  }, [initialData]);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (field: keyof NAPData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddLocation = () => {
    const newLocation: OfficeLocation = {
      id: uuidv4(),
      ...EMPTY_LOCATION,
      is_headquarters: formData.locations?.length === 0,
    };
    setFormData(prev => ({
      ...prev,
      locations: [...(prev.locations || []), newLocation]
    }));
    setExpandedLocationId(newLocation.id);
  };

  const handleRemoveLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      locations: (prev.locations || []).filter(loc => loc.id !== locationId)
    }));
    if (expandedLocationId === locationId) {
      setExpandedLocationId(null);
    }
  };

  const handleLocationChange = (locationId: string, field: keyof OfficeLocation, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      locations: (prev.locations || []).map(loc =>
        loc.id === locationId
          ? { ...loc, [field]: value }
          : field === 'is_headquarters' && value === true
            ? { ...loc, is_headquarters: false }
            : loc
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof NAPData, string>> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.founded_year && !/^\d{4}$/.test(formData.founded_year)) {
      newErrors.founded_year = 'Please enter a valid year (e.g., 2020)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave(formData);
  };

  const gridClass = compactMode
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const hasLocations = (formData.locations?.length || 0) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Information */}
      <div className={gridClass}>
        {/* Company Name */}
        <div className={compactMode ? '' : 'md:col-span-2'}>
          <Label htmlFor="company_name">
            Company Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="company_name"
            type="text"
            value={formData.company_name}
            onChange={(e) => handleChange('company_name', e.target.value)}
            placeholder="Your Company Name"
            className={errors.company_name ? 'border-red-500' : ''}
          />
          {errors.company_name && (
            <p className="mt-1 text-sm text-red-400">{errors.company_name}</p>
          )}
        </div>

        {/* Primary Address (backward compatible) */}
        <div className={compactMode ? '' : 'md:col-span-2'}>
          <Label htmlFor="address">
            Business Address {hasLocations && <span className="text-gray-500">(Primary/Headquarters)</span>}
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="123 Main St, City, Country"
          />
          <p className="mt-1 text-xs text-gray-500">
            Full address for NAP consistency (E-A-T)
          </p>
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">
            Contact Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="info@yourcompany.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Founded Year */}
        <div>
          <Label htmlFor="founded_year">
            Founded Year <span className="text-gray-500">(Optional)</span>
          </Label>
          <Input
            id="founded_year"
            type="text"
            value={formData.founded_year || ''}
            onChange={(e) => handleChange('founded_year', e.target.value)}
            placeholder="2020"
            maxLength={4}
            className={errors.founded_year ? 'border-red-500' : ''}
          />
          {errors.founded_year && (
            <p className="mt-1 text-sm text-red-400">{errors.founded_year}</p>
          )}
        </div>
      </div>

      {/* Additional Locations Section */}
      <div className="border-t border-gray-700 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Additional Office Locations</h3>
            <p className="text-sm text-gray-400">Add multiple offices for companies with locations in different cities or countries</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddLocation}
            className="text-sm"
          >
            + Add Location
          </Button>
        </div>

        {/* Location Cards */}
        <div className="space-y-3">
          {formData.locations?.map((location, index) => (
            <Card
              key={location.id}
              className={`p-4 border ${location.is_headquarters ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700'}`}
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedLocationId(expandedLocationId === location.id ? null : location.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">#{index + 1}</span>
                  <span className="text-white font-medium">
                    {location.name || 'Unnamed Location'}
                  </span>
                  {location.is_headquarters && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">HQ</span>
                  )}
                  {location.city && location.country && (
                    <span className="text-gray-400 text-sm">
                      {location.city}, {location.country}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLocation(location.id);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                  <span className="text-gray-500">
                    {expandedLocationId === location.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedLocationId === location.id && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Name */}
                    <div>
                      <Label>Location Name</Label>
                      <Input
                        type="text"
                        value={location.name}
                        onChange={(e) => handleLocationChange(location.id, 'name', e.target.value)}
                        placeholder="e.g., Amsterdam Office, US Headquarters"
                      />
                    </div>

                    {/* Is Headquarters */}
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={location.is_headquarters}
                          onChange={(e) => handleLocationChange(location.id, 'is_headquarters', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-white">Mark as Headquarters</span>
                      </label>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <Label>Full Address</Label>
                      <Input
                        type="text"
                        value={location.address}
                        onChange={(e) => handleLocationChange(location.id, 'address', e.target.value)}
                        placeholder="Street address, building, suite..."
                      />
                    </div>

                    {/* City */}
                    <div>
                      <Label>City</Label>
                      <Input
                        type="text"
                        value={location.city || ''}
                        onChange={(e) => handleLocationChange(location.id, 'city', e.target.value)}
                        placeholder="Amsterdam"
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <Label>Country</Label>
                      <Input
                        type="text"
                        value={location.country || ''}
                        onChange={(e) => handleLocationChange(location.id, 'country', e.target.value)}
                        placeholder="Netherlands (or NL)"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        value={location.phone}
                        onChange={(e) => handleLocationChange(location.id, 'phone', e.target.value)}
                        placeholder="+31 20 123 4567"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <Label>Email (Optional)</Label>
                      <Input
                        type="email"
                        value={location.email || ''}
                        onChange={(e) => handleLocationChange(location.id, 'email', e.target.value)}
                        placeholder="amsterdam@company.com"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {formData.locations?.length === 0 && (
            <div className="text-center py-6 text-gray-500 border border-dashed border-gray-700 rounded-lg">
              <p>No additional locations added yet.</p>
              <p className="text-sm mt-1">Click "Add Location" to add offices in different cities or countries.</p>
            </div>
          )}
        </div>
      </div>

      {/* NAP Consistency Tips */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">NAP Consistency Tips</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Use the exact same company name format everywhere
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Include full address with postal code
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Use consistent phone format (e.g., +1 for US)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Email should match your domain for credibility
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
        {showCancelButton && onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            'Save NAP Data'
          )}
        </Button>
      </div>
    </form>
  );
};
