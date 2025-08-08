'use client';

import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem, NavbarMenuToggle } from '@heroui/navbar';
import { Button } from '@heroui/button';
import { Link } from '@heroui/link';
import { Divider } from '@heroui/divider';
import { Chip } from '@heroui/chip';
import { Badge } from '@heroui/badge';
import { Avatar } from '@heroui/avatar';
import { Tooltip } from '@heroui/tooltip';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  UserPlus, 
  Moon, 
  Sun,
  Activity,
  Heart,
  Sparkles,
  Bell,
  Settings,
  Users,
  ChevronRight,
  TrendingUp,
  Shield
} from 'lucide-react';
import NextLink from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications] = useState(3);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { label: '홈', href: '/', icon: Home, color: 'from-blue-500 to-cyan-500', badge: null },
    { label: '일정 관리', href: '/schedule', icon: Calendar, color: 'from-purple-500 to-pink-500', badge: '5' },
    { label: '대시보드', href: '/dashboard', icon: BarChart3, color: 'from-orange-500 to-red-500', badge: 'new' },
    { label: '환자 등록', href: '/patients/register', icon: UserPlus, color: 'from-green-500 to-emerald-500', badge: null },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  if (!mounted) return null;

  return (
    <Navbar 
      onMenuOpenChange={setIsMenuOpen}
      className={`
        transition-all duration-500
        ${isScrolled 
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-purple-500/10' 
          : 'bg-gradient-to-r from-white/90 via-white/95 to-white/90 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 backdrop-blur-lg'
        }
        border-b 
        ${isScrolled
          ? 'border-purple-200/50 dark:border-purple-800/50'
          : 'border-transparent'
        }
      `}
      maxWidth="xl"
      height="5rem"
    >
      {/* Brand */}
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          className="sm:hidden text-slate-600 dark:text-slate-300"
        />
        <NavbarBrand>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <NextLink href="/" className="flex items-center space-x-3 group">
              {/* Animated Logo */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 animate-pulse transition-opacity" />
                <motion.div 
                  className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 p-3 rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart className="w-6 h-6 text-white" fill="white" />
                  <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-bounce" />
                </motion.div>
              </div>
              
              {/* Brand Text */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">
                    CareCycle
                  </span>
                  <Chip 
                    size="sm" 
                    variant="shadow"
                    classNames={{
                      base: "bg-gradient-to-r from-violet-500 to-fuchsia-500 border-none",
                      content: "text-white font-bold text-xs"
                    }}
                  >
                    PRO
                  </Chip>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-500" />
                  정신건강 관리 플랫폼 v2.0
                </span>
              </div>
            </NextLink>
          </motion.div>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Menu */}
      <NavbarContent className="hidden sm:flex gap-2" justify="center">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <NavbarItem isActive={isActive(item.href)}>
                <Tooltip 
                  content={item.label} 
                  placement="bottom"
                  classNames={{
                    base: "bg-gradient-to-r " + item.color,
                    content: "text-white font-medium"
                  }}
                >
                  <Link
                    as={NextLink}
                    href={item.href}
                    className="relative group"
                  >
                    <div className={`
                      flex items-center space-x-2 px-4 py-2.5 rounded-2xl
                      transition-all duration-300 font-medium
                      ${
                        isActive(item.href)
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-purple-500/25`
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }
                      ${!isActive(item.href) && 'hover:bg-gradient-to-r hover:' + item.color + ' hover:text-white hover:shadow-lg hover:shadow-purple-500/25'}
                      transform hover:scale-105
                    `}>
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge 
                          size="sm" 
                          color={item.badge === 'new' ? 'success' : 'danger'}
                          variant="shadow"
                          className="absolute -top-2 -right-2"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {isActive(item.href) && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-white/20"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                  </Link>
                </Tooltip>
              </NavbarItem>
            </motion.div>
          );
        })}
      </NavbarContent>

      {/* Right Menu */}
      <NavbarContent justify="end">
        {/* Live Status Indicator */}
        <NavbarItem className="hidden lg:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Chip
              startContent={<Activity className="w-3 h-3 animate-pulse" />}
              variant="dot"
              classNames={{
                base: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800",
                content: "text-green-700 dark:text-green-300 font-medium text-xs",
                dot: "bg-green-500 animate-pulse"
              }}
            >
              시스템 정상
            </Chip>
          </motion.div>
        </NavbarItem>

        {/* Performance Indicator */}
        <NavbarItem className="hidden md:flex">
          <Tooltip content="오늘의 성과">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">+24%</span>
            </div>
          </Tooltip>
        </NavbarItem>

        {/* Notifications */}
        <NavbarItem>
          <Badge content={notifications} color="danger" shape="circle" size="sm">
            <Button
              variant="light"
              size="sm"
              isIconOnly
              className="text-slate-600 dark:text-slate-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20"
            >
              <Bell className="w-5 h-5" />
            </Button>
          </Badge>
        </NavbarItem>

        {/* Theme Toggle with Animation */}
        <NavbarItem>
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="flat"
                size="sm"
                isIconOnly
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="테마 전환"
                className={`
                  shadow-lg transform hover:scale-110 transition-all duration-300
                  ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                  }
                `}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </NavbarItem>

        {/* User Avatar */}
        <NavbarItem className="hidden sm:flex">
          <Tooltip content="프로필">
            <Avatar
              isBordered
              color="primary"
              src="https://i.pravatar.cc/150?u=a04258114e29026708c"
              className="cursor-pointer transition-transform hover:scale-110"
              size="sm"
            />
          </Tooltip>
        </NavbarItem>

        {/* CTA Button */}
        <NavbarItem className="hidden md:flex">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              as={NextLink}
              href="/patients/register"
              variant="shadow"
              size="sm"
              startContent={<UserPlus className="w-4 h-4" />}
              endContent={<ChevronRight className="w-3 h-3" />}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
            >
              환자 등록
            </Button>
          </motion.div>
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-gradient-to-b from-white/98 to-purple-50/98 dark:from-slate-900/98 dark:to-purple-900/20 backdrop-blur-xl">
        <div className="py-6">
          <div className="mb-6 px-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">메뉴</h3>
            <Divider className="bg-gradient-to-r from-purple-400 to-pink-400" />
          </div>
          
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={`${item.href}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <NavbarMenuItem>
                  <Link
                    as={NextLink}
                    href={item.href}
                    className={`
                      relative flex items-center space-x-3 w-full py-4 px-4 rounded-2xl
                      transition-all duration-300 group
                      ${
                        isActive(item.href)
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                          : 'text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:' + item.color + ' hover:text-white hover:shadow-lg'
                      }
                    `}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className={`p-2 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        size="sm" 
                        color={item.badge === 'new' ? 'success' : 'danger'}
                        variant="shadow"
                        className="absolute top-2 right-2"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {isActive(item.href) && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </Link>
                </NavbarMenuItem>
              </motion.div>
            );
          })}
          
          <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
            <div className="px-4 space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-800/50 dark:to-purple-800/20">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">테마 설정</span>
                <Button
                  variant="shadow"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  startContent={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  className={`
                    ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    }
                  `}
                >
                  {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                </Button>
              </div>
              
              {/* System Status */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">시스템 정상</span>
                  </div>
                  <Chip size="sm" color="success" variant="flat">실시간</Chip>
                </div>
              </div>
              
              {/* CTA Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  as={NextLink}
                  href="/patients/register"
                  variant="shadow"
                  size="md"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                  startContent={<UserPlus className="w-4 h-4" />}
                  endContent={<Sparkles className="w-4 h-4" />}
                  onClick={() => setIsMenuOpen(false)}
                >
                  환자 등록 시작하기
                </Button>
              </motion.div>
              
              {/* User Profile */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-800/50 dark:to-purple-800/20">
                <Avatar
                  isBordered
                  color="primary" 
                  src="https://i.pravatar.cc/150?u=a04258114e29026708c"
                  size="md"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">관리자</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">admin@carecycle.kr</p>
                </div>
                <Settings className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </NavbarMenu>
    </Navbar>
  );
}