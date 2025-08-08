'use client';

import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Progress } from '@heroui/progress';
import { Badge } from '@heroui/badge';
import { Tooltip } from '@heroui/tooltip';
import { 
  UserPlus, 
  Calendar, 
  Activity, 
  BarChart3, 
  Shield, 
  Clock, 
  Bell,
  Sparkles,
  TrendingUp,
  Users,
  Brain,
  Heart,
  Zap,
  Star,
  Check,
  ArrowRight,
  Target,
  Award,
  Rocket,
  Plus,
  Play,
  ChevronRight,
  Hexagon,
  Triangle
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const FloatingElement = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

const StatCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev < value) {
          return Math.min(prev + Math.ceil(value / 20), value);
        }
        return value;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [value]);
  
  return <span>{count}{suffix}</span>;
};

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mainFeatures = [
    {
      icon: UserPlus,
      title: '환자 관리',
      subtitle: 'Patient Management',
      description: '환자 정보와 관리 항목을 등록하여 자동으로 일정을 생성하고 체계적으로 관리합니다',
      href: '/patients/register',
      buttonText: '환자 등록하기',
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
      cardBg: 'bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      stats: { value: 150, label: '활성 환자' },
      badge: 'AI 지원',
      neonClass: 'neon-purple'
    },
    {
      icon: Calendar,
      title: '일정 관리',
      subtitle: 'Schedule Management',
      description: '오늘의 검사·주사 일정을 확인하고 시행 여부를 체크하여 완료 상태를 관리합니다',
      href: '/schedule',
      buttonText: '일정 확인하기',
      gradient: 'from-pink-600 via-rose-600 to-red-600',
      cardBg: 'bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-red-500/20',
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
      stats: { value: 24, label: '오늘 일정' },
      badge: '실시간',
      neonClass: 'neon-pink'
    },
    {
      icon: BarChart3,
      title: '실시간 모니터링',
      subtitle: 'Real-time Monitoring',
      description: '전체 환자의 검사·주사 현황을 실시간으로 모니터링하고 분석 데이터를 제공합니다',
      href: '/dashboard',
      buttonText: '대시보드 보기',
      gradient: 'from-blue-600 via-cyan-600 to-teal-600',
      cardBg: 'bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      stats: { value: 98, label: '완료율 %' },
      badge: '분석',
      neonClass: 'neon-blue'
    }
  ];

  const subFeatures = [
    {
      icon: Brain,
      title: 'AI 기반 예측',
      description: '머신러닝으로 최적 일정 예측',
      gradient: 'from-purple-500 to-indigo-600',
      bgGradient: 'from-purple-500/10 to-indigo-500/10'
    },
    {
      icon: Shield,
      title: '보안 시스템',
      description: '의료 정보 암호화 보호',
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      icon: Zap,
      title: '실시간 동기화',
      description: '모든 기기에서 즉시 반영',
      gradient: 'from-yellow-500 to-orange-600',
      bgGradient: 'from-yellow-500/10 to-orange-500/10'
    },
    {
      icon: Heart,
      title: '환자 중심 설계',
      description: '편안한 사용자 경험 제공',
      gradient: 'from-red-500 to-pink-600',
      bgGradient: 'from-red-500/10 to-pink-500/10'
    },
    {
      icon: Target,
      title: '목표 달성률',
      description: '치료 목표 추적 및 관리',
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    {
      icon: Award,
      title: '인증 시스템',
      description: '의료 표준 인증 획득',
      gradient: 'from-indigo-500 to-purple-600',
      bgGradient: 'from-indigo-500/10 to-purple-500/10'
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background now handled by subtle globals; remove intense local layers */}
      <div className="fixed inset-0 -z-10" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Hero Section with Enhanced Vibrant Effects */}
        <motion.div 
          className="text-center mb-20 relative"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Floating Badge with neon effect */}
          <motion.div
            className="inline-block mb-8 animate-float"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="relative">
              <Chip
                startContent={<Rocket className="w-5 h-5" />}
                variant="shadow"
                size="lg"
                classNames={{
                  base: "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 border-none neon-purple px-6 py-3",
                  content: "text-white font-bold text-lg"
                }}
              >
                🚀 CareCycle 2.0 Pro 출시!
              </Chip>
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-30"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* Main Title with Enhanced Gradient and Glow */}
          <motion.h1 
            className="text-5xl md:text-7xl font-extrabold mb-8 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="gradient-text relative z-10">
              CareCycle
            </span>
            {/* Removed extra glow layers for cleaner medical look */}
          </motion.h1>

          {/* Subtitle with vibrant styling */}
          <motion.div
            className="relative mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="text-xl md:text-2xl font-semibold max-w-3xl mx-auto leading-relaxed text-slate-700 dark:text-slate-200">
              <motion.span
                className="inline-block"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="inline w-8 h-8 text-yellow-500 mr-3" />
              </motion.span>
              정신건강의학과 검사·주사 일정 관리의
              <br />
               <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent font-extrabold">
                혁신적인 솔루션
              </span>
              <motion.span
                className="inline-block"
                animate={{ rotate: [0, -15, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="inline w-8 h-8 text-yellow-500 ml-3" />
              </motion.span>
            </p>
          </motion.div>

          {/* Vibrant Stats Section */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {[
              { value: 500, suffix: '+', label: '관리 환자', gradient: 'from-purple-600 to-violet-600', bg: 'from-purple-500/20 to-violet-500/20' },
              { value: 98, suffix: '%', label: '자동화율', gradient: 'from-pink-600 to-rose-600', bg: 'from-pink-500/20 to-rose-500/20' },
              { value: 24, suffix: '/7', label: '실시간 지원', gradient: 'from-blue-600 to-cyan-600', bg: 'from-blue-500/20 to-cyan-500/20' }
            ].map((stat, idx) => (
              <motion.div 
                key={idx} 
                 className={`glass-card rounded-2xl p-6 text-center bg-white/70 dark:bg-slate-900/40`}
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                 <div className={`text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-2`}>
                  <StatCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.div 
              whileHover={{ scale: 1.08, y: -3 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="md"
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3 rounded-md shadow-sm"
                endContent={
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.div>
                }
              >
                무료 체험 시작하기
              </Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.08, y: -3 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="md"
                variant="bordered"
                className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-6 py-3 rounded-md"
                startContent={
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Play className="w-6 h-6" />
                  </motion.div>
                }
              >
                실시간 데모 보기
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Vibrant Main Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {mainFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                className="relative group"
              >
                <Card 
                  className={`
                    h-full relative overflow-hidden glass-card
                    bg-white/80 dark:bg-slate-900/40
                    border border-slate-200/70 dark:border-white/10
                    transition-all duration-300
                    ${hoveredCard === index ? 'scale-[1.02] shadow-md' : 'shadow-sm'}
                  `}
                >
                  {/* Shimmering overlay */}
                      {/* Removed aggressive shimmer overlay */}

                  {/* Floating Badge */}
                  <motion.div 
                    className="absolute -top-2 -right-2 z-10"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: hoveredCard === index ? [1, 1.1, 1] : 1
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Chip
                      size="lg"
                      variant="shadow"
                      classNames={{
                        base: `bg-gradient-to-r ${feature.gradient} border-none pulse-glow`,
                        content: "text-white font-bold text-sm px-2"
                      }}
                    >
                      ✨ {feature.badge}
                    </Chip>
                  </motion.div>

                  <CardHeader className="relative z-10 pb-0 pt-8">
                    <div className="flex items-start gap-6 w-full">
                      {/* Enhanced Animated Icon */}
                      <motion.div
                        className="relative"
                        animate={hoveredCard === index ? { 
                          rotate: [0, -15, 15, 0],
                          scale: [1, 1.1, 1]
                        } : {}}
                        transition={{ duration: 0.8 }}
                      >
                         <div className={`
                          w-16 h-16 rounded-2xl flex items-center justify-center relative
                          bg-sky-600 shadow-sm transition-all duration-300
                        `}>
                          <Icon className="w-8 h-8 text-white relative z-10" />
                          {/* Icon glow effect */}
                          <motion.div
                            className="absolute inset-0 rounded-3xl bg-gradient-to-r from-white/20 to-transparent opacity-0"
                            animate={{ opacity: hoveredCard === index ? [0, 0.4, 0] : 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                        {/* Dynamic glow */}
                        <motion.div
                          className={`absolute -inset-3 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0`}
                          animate={{ opacity: hoveredCard === index ? [0.3, 0.7, 0.3] : 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </motion.div>

                      <div className="flex-1">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          {feature.subtitle}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="relative z-10 py-6">
                     <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed text-base">
                      {feature.description}
                    </p>

                    {/* Enhanced Stats Display */}
                     <motion.div 
                       className={`mb-6 p-5 rounded-2xl glass-card`}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {feature.stats.label}
                        </span>
                         <motion.span 
                           className={`text-2xl font-extrabold text-slate-800 dark:text-white`}
                          animate={{ scale: hoveredCard === index ? [1, 1.1, 1] : 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          {feature.stats.value}
                        </motion.span>
                      </div>
                       <Progress 
                        value={feature.stats.value} 
                        maxValue={index === 2 ? 100 : 200}
                         className="h-2"
                        classNames={{
                           indicator: `bg-sky-600`,
                           base: "bg-slate-200/60 dark:bg-slate-800/60"
                        }}
                      />
                    </motion.div>

                    {/* Enhanced CTA Button */}
                    <Link href={feature.href}>
                      <motion.div 
                        whileHover={{ scale: 1.05, y: -2 }} 
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          className={`
                            font-semibold text-white text-sm py-3 px-4
                            bg-sky-600 hover:bg-sky-700
                            transition-colors rounded-md
                          `}
                          size="md"
                          endContent={
                            <motion.div
                              animate={hoveredCard === index ? { x: [0, 8, 0] } : { x: 0 }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.div>
                          }
                        >
                          {feature.buttonText}
                        </Button>
                      </motion.div>
                    </Link>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Enhanced Sub-Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative inline-block mb-6"
            >
              <Chip
                startContent={<Star className="w-5 h-5" />}
                variant="shadow"
                size="lg"
                classNames={{
                  base: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 mb-4 neon-purple px-6 py-3",
                  content: "text-white font-bold text-lg"
                }}
              >
                🌟 핵심 기능들
              </Chip>
              <motion.div
                className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-20"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            
            <motion.h2 
              className="text-3xl md:text-5xl font-extrabold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="gradient-text">
                완벽한 의료 관리
              </span>
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                솔루션
              </span>
            </motion.h2>
            
            <motion.p 
              className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              최첨단 기술과 의료 전문성이 만나는 곳에서
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent font-semibold">
                혁신적인 의료 서비스를 경험하세요
              </span>
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {subFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -15, scale: 1.05, transition: { duration: 0.3 } }}
                >
                  <Card className={`
                    p-6 h-full glass-card relative overflow-hidden
                    bg-white/80 dark:bg-slate-900/40
                    border border-slate-200/70 dark:border-white/10
                    transition-all duration-300
                    hover:shadow-md group
                  `}>
                    {/* Animated background pattern */}
                    <motion.div
                      className="absolute inset-0 opacity-5"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient}`} />
                    </motion.div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                      {/* Enhanced Icon */}
                      <motion.div
                        className="relative mb-6"
                        whileHover={{ 
                          rotate: [0, -10, 10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className={`
                          w-14 h-14 rounded-2xl flex items-center justify-center relative
                          bg-sky-600 shadow-sm transition-all duration-300
                        `}>
                          <Icon className="w-7 h-7 text-white relative z-10" />
                          {/* Icon sparkle effect */}
                          <motion.div
                            className="absolute inset-0 rounded-3xl"
                            animate={{
                              boxShadow: [
                                '0 0 20px rgba(255, 255, 255, 0)',
                                '0 0 20px rgba(255, 255, 255, 0.3)',
                                '0 0 20px rgba(255, 255, 255, 0)'
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                        {/* Dynamic glow ring */}
                        <motion.div
                          className={`absolute -inset-2 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-40`}
                          animate={{ opacity: [0, 0.4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </motion.div>

                      {/* Enhanced content */}
                      <h3 className="font-extrabold text-lg md:text-xl text-slate-800 dark:text-white mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-normal text-sm">
                        {feature.description}
                      </p>

                      {/* Decorative elements */}
                      <motion.div
                        className="mt-6 w-16 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30"
                        animate={{ scaleX: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Ultra-Vibrant Final CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative"
        >
          <Card className="max-w-5xl mx-auto overflow-hidden relative glass-card">

            {/* Removed decorative floating shapes */}

            <CardBody className="relative z-10 py-20 px-8 text-center">
              {/* Animated heart with glow */}
              <motion.div
                className="relative mx-auto mb-8"
                animate={{ 
                  y: [0, -15, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Heart className="w-20 h-20 text-white mx-auto" />
                <motion.div
                  className="absolute inset-0 w-20 h-20 mx-auto"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(255, 255, 255, 0)',
                      '0 0 40px rgba(255, 255, 255, 0.4)',
                      '0 0 60px rgba(255, 255, 255, 0.2)',
                      '0 0 20px rgba(255, 255, 255, 0)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <motion.h2 
                className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <motion.span
                  animate={{ 
                    textShadow: [
                      '0 0 10px rgba(255, 255, 255, 0.5)',
                      '0 0 20px rgba(255, 255, 255, 0.8)',
                      '0 0 10px rgba(255, 255, 255, 0.5)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  지금 바로 시작하세요!
                </motion.span>
              </motion.h2>
              
              <motion.p 
                className="text-base md:text-lg text-slate-700 dark:text-slate-200 mb-8 max-w-3xl mx-auto font-medium leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <span className="font-bold">CareCycle 2.0</span>과 함께 
                <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent font-black">
                  더 나은 의료 서비스
                </span>를 제공하고
                <br />
                환자들의 삶의 질을 혁신적으로 높여보세요
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <motion.div 
                  whileHover={{ scale: 1.1, y: -5 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/patients/register">
                    <Button 
                      size="md" 
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3 rounded-md shadow-sm"
                      startContent={
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.div>
                      }
                      endContent={<Sparkles className="w-5 h-5" />}
                    >
                      첫 환자 등록하기
                    </Button>
                  </Link>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.1, y: -5 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/dashboard">
                    <Button 
                      size="md" 
                      variant="bordered" 
                      className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-6 py-3 rounded-md"
                      startContent={
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </motion.div>
                      }
                    >
                      대시보드 둘러보기
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Enhanced Trust Indicators */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                {[
                  { icon: Shield, text: "의료정보 보안 인증", gradient: "from-emerald-400 to-cyan-400" },
                  { icon: Check, text: "24/7 전담 기술 지원", gradient: "from-yellow-400 to-orange-400" },
                  { icon: Users, text: "500+ 의료기관 신뢰", gradient: "from-pink-400 to-rose-400" }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    className="flex items-center justify-center gap-3 p-3 rounded-xl glass-card"
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.5 }}
                    >
                      <item.icon className={`w-6 h-6 bg-gradient-to-r ${item.gradient} rounded p-1`} />
                    </motion.div>
                     <span className="text-slate-800 dark:text-white font-semibold text-sm md:text-base">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}