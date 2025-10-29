"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../axios';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await axiosInstance.get('/admin/users');
        const userData = { role: 'admin' };
        
        setUser(userData);
        
        if (userData && userData.role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, [router]);

  return { isAdmin, loading, user };
};

export const withAdminAuth = (WrappedComponent) => {
  return function AdminProtectedComponent(props) {
    const { isAdmin, loading } = useAdminAuth();

    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}>
          <div>جاري التحقق من الصلاحيات...</div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h2>غير مصرح لك بالوصول لهذه الصفحة</h2>
          <p>تحتاج صلاحيات مدير للوصول لهذه الصفحة</p>
          <button onClick={() => window.location.href = '/'}>
            العودة للصفحة الرئيسية
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
