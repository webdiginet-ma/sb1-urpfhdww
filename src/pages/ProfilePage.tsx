import React, { useState } from 'react';
import { User, Mail, Shield, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      await updateProfile({
        full_name: formData.full_name,
        email: formData.email,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (message) setMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.full_name || 'User Profile'}
              </h2>
              <p className="text-gray-600 capitalize flex items-center">
                <Shield size={16} className="mr-1" />
                {user?.role} Account
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              icon={User}
              placeholder="Enter your full name"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              placeholder="Enter your email"
            />

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield size={20} className="text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Role</p>
                  <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact your administrator to change your role.
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div className={`px-4 py-3 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                icon={Save}
                loading={isUpdating}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Account Created</p>
              <p className="text-gray-600">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Last Updated</p>
              <p className="text-gray-600">
                {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};