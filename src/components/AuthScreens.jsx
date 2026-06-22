import React, { useEffect, useRef, useState } from "react";
import { Logo, GoogleIcon, ChevronIcon, CheckIcon, LangButton } from "./ui/Shared.jsx";
import "./AuthScreens.css";

function AuthTitle({ title, accent = "", centered = false, compact = false }) {
  return (
    <h1 className={`${centered ? "text-center" : ""} ${compact ? "text-[33px] xl:text-[42px] min-[1400px]:text-[48px]" : "text-[37px] sm:text-[40px] xl:text-[50px] min-[1400px]:text-[64px]"} font-extrabold leading-[0.95] tracking-normal text-joyBlue`}>
      {title}
      {accent ? <span className="text-joyOrange">{accent}</span> : null}
    </h1>
  );
}

function AuthSubtitle({ children, centered = false }) {
  return (
    <p className={`${centered ? "mx-auto text-center" : ""} mt-2 max-w-[290px] text-[12px] font-medium leading-[1.35] text-joyBlue xl:mt-3 xl:max-w-[420px] xl:text-[15px] xl:leading-[1.34] min-[1400px]:mt-4 min-[1400px]:max-w-[450px] min-[1400px]:text-[18px] min-[1400px]:leading-[1.4]`}>
      {children}
    </p>
  );
}

function TextInput({ placeholder, type = "text", autoComplete, value, onChange }) {
  return <input className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder={placeholder} type={type} autoComplete={autoComplete} value={value} onChange={onChange} />;
}

function PrimaryButton({ children, type = "button", onClick }) {
  return (
    <button type={type} onClick={onClick} className="mt-2 h-[39px] w-full rounded-full bg-joyOrange text-[15px] font-extrabold text-white shadow-[0_15px_32px_rgba(228,102,48,0.25)] transition hover:-translate-y-0.5 hover:bg-[#d75d29] focus:outline-none focus:ring-4 focus:ring-joyOrange/25 xl:mt-3 xl:h-[48px] xl:text-[19px] min-[1400px]:h-[64px] min-[1400px]:text-[24px]">
      {children}
    </button>
  );
}

function GoogleButton() {
  return (
    <button type="button" className="flex h-[39px] w-full items-center justify-center gap-3 rounded-[10px] border border-joyBlue/15 bg-white/40 text-[12px] font-semibold text-joyBlue transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-joyBlue/10 xl:h-[48px] xl:gap-4 xl:rounded-[14px] xl:text-[16px] min-[1400px]:h-[64px] min-[1400px]:text-[22px]">
      Google orqali kirish
      <GoogleIcon />
    </button>
  );
}

function Divider({ label = "yoki" }) {
  return (
    <div className="auth-motion-item my-2 flex items-center gap-3 px-[88px] text-[10px] font-extrabold text-joyDeep xl:my-3 xl:px-[120px] xl:text-[11px] min-[1400px]:my-3 min-[1400px]:px-[130px] min-[1400px]:text-[14px]">
      <span className="h-px flex-1 bg-joyBlue/13" />
      {label}
      <span className="h-px flex-1 bg-joyBlue/13" />
    </div>
  );
}

function AuthColumn({ children, narrow = false }) {
  return (
    <div className="flex min-h-[inherit] flex-col px-7 pb-10 pt-8 sm:px-9 md:px-10 xl:px-12 xl:pb-9 xl:pt-8 min-[1400px]:px-16 min-[1400px]:pb-14 min-[1400px]:pt-12">
      <header className="relative z-50 flex items-center justify-between">
        <Logo />
        <LangButton />
      </header>
      <main className={`mx-auto mt-8 flex w-full flex-1 flex-col justify-center xl:mt-8 ${narrow ? "max-w-[300px] xl:max-w-[390px] min-[1400px]:max-w-[430px]" : "max-w-[310px] xl:max-w-[450px] min-[1400px]:max-w-[480px]"} min-[1400px]:mt-8`}>
        {children}
      </main>
    </div>
  );
}

export function AuthForm({ onRegister }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onRegister === "function") {
      onRegister();
    } else {
      window.location.hash = "#home";
    }
  };

  return (
    <div className="flex min-h-[inherit] flex-col px-7 pb-10 pt-8 sm:px-9 md:px-10 xl:px-12 xl:pb-9 xl:pt-8 min-[1400px]:px-16 min-[1400px]:pb-14 min-[1400px]:pt-12">
      <header className="relative z-50 flex items-center justify-between">
        <Logo />
        <LangButton />
      </header>
      <main className="mx-auto mt-8 flex w-full max-w-[310px] flex-1 flex-col justify-center xl:mt-8 xl:max-w-[450px] min-[1400px]:mt-8 min-[1400px]:max-w-[480px]">
        <div className="mb-4 xl:mb-5 min-[1400px]:mb-5">
          <h1 className="text-[37px] font-extrabold leading-[0.95] tracking-normal text-joyBlue sm:text-[40px] xl:text-[50px] min-[1400px]:text-[64px]">
            Hush <span className="text-joyOrange">Kelibsiz!</span>
          </h1>
          <p className="mt-2 max-w-[290px] text-[12px] font-medium leading-[1.35] text-joyBlue xl:mt-3 xl:max-w-[420px] xl:text-[15px] xl:leading-[1.34] min-[1400px]:mt-4 min-[1400px]:max-w-[450px] min-[1400px]:text-[18px] min-[1400px]:leading-[1.4]">
            Tadbirkorlar va yirik korxonalar uchun zamonaviy ish maydoni.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2 xl:space-y-3 min-[1400px]:space-y-3">
          <div className="grid grid-cols-2 gap-2 xl:gap-3 min-[1400px]:gap-4">
            <input className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder="Ism" autoComplete="given-name" />
            <input className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder="Familiya" autoComplete="family-name" />
          </div>
          <input className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder="Email | Telefon raqami" autoComplete="email" />
          <input type="password" className="form-field w-full rounded-[10px] px-4 text-[12px] font-semibold xl:rounded-[14px] xl:px-5 xl:text-[16px] min-[1400px]:px-6 min-[1400px]:text-[20px]" placeholder="Parol" autoComplete="new-password" />
          <label className="flex items-start gap-2 pt-1 text-[9px] font-bold leading-3 text-joyDeep xl:gap-3 xl:pt-2 xl:text-[11px] xl:leading-[1.25] min-[1400px]:text-[14px]">
            <input className="mt-[1px] h-[13px] w-[13px] rounded border-joyBlue/20 accent-joyOrange xl:mt-[2px] xl:h-[18px] xl:w-[18px]" type="checkbox" />
            <span>
              Men <a className="text-joyOrange" href="#">Foydalanish shartlari</a> bilan tanishdim va roziman.
            </span>
          </label>
          <button type="submit" className="mt-2 h-[39px] w-full rounded-full bg-joyOrange text-[15px] font-extrabold text-white shadow-[0_15px_32px_rgba(228,102,48,0.25)] transition hover:-translate-y-0.5 hover:bg-[#d75d29] focus:outline-none focus:ring-4 focus:ring-joyOrange/25 xl:mt-3 xl:h-[48px] xl:text-[19px] min-[1400px]:h-[64px] min-[1400px]:text-[24px]">
            Ro'yxatdan o'tish
          </button>
        </form>
        <Divider />
        <GoogleButton />
        <p className="mt-4 text-center text-[10px] font-bold text-joyDeep xl:mt-4 xl:text-[11px] min-[1400px]:mt-4 min-[1400px]:text-[14px]">
          Akkauntingiz bormi? <a href="#login" className="auth-link">Kirish</a>
        </p>
      </main>
    </div>
  );
}

export function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (event) => {
    if (event) {
      event.preventDefault();
    }
    if (!email) return;

    const name = email.split("@")[0] || "Foydalanuvchi";

    if (typeof onLogin === "function") {
      onLogin({ name, email });
    } else {
      window.location.hash = "#home";
    }
  };

  return (
    <AuthColumn narrow>
      <div className="mb-4 xl:mb-5 min-[1400px]:mb-5">
        <AuthTitle title="Hush " accent="kelibsiz!" compact />
        <AuthSubtitle>Joyzone hisobingizga kiring va bronlaringizni bir joydan boshqaring.</AuthSubtitle>
      </div>
      <form onSubmit={handleLogin} className="space-y-2 xl:space-y-3 min-[1400px]:space-y-3">
        <TextInput
          placeholder="Email | Telefon raqami"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextInput
          placeholder="Parol"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="auth-motion-item text-right text-[10px] font-extrabold xl:text-[12px] min-[1400px]:text-[14px]">
          <a href="#forgot" className="auth-link">Parolni unutdingizmi?</a>
        </div>
        <Divider />
        <GoogleButton />
        <PrimaryButton type="submit">Kirish</PrimaryButton>
      </form>
      <p className="mt-4 text-center text-[10px] font-bold text-joyDeep xl:mt-4 xl:text-[11px] min-[1400px]:mt-4 min-[1400px]:text-[14px]">
        Akkauntingiz yo'qmi? <a href="#register" className="auth-link">Ro'yxatdan o'ting</a>
      </p>
    </AuthColumn>
  );
}

export function ForgotPasswordForm() {
  return (
    <AuthColumn narrow>
      <div className="mb-5 xl:mb-6 min-[1400px]:mb-7">
        <AuthTitle title="Parolni " accent="tiklash" compact />
        <AuthSubtitle>Hisobingizga ulangan email yoki telefon raqamini kiriting. Parolni tiklash uchun tasdiqlash kodini yuboramiz.</AuthSubtitle>
      </div>
      <form className="space-y-3 xl:space-y-4">
        <TextInput placeholder="Email | Telefon raqami" autoComplete="email" />
        <PrimaryButton type="button" onClick={() => { window.location.hash = "verify"; }}>
          Tiklash kodini yuborish
        </PrimaryButton>
      </form>
      <p className="mt-5 text-center text-[10px] font-bold text-joyDeep xl:mt-5 xl:text-[12px] min-[1400px]:text-[14px]">
        Parolingiz esingizdami? <a href="#login" className="auth-link">Kirish</a>
      </p>
    </AuthColumn>
  );
}

export function VerifyCodeForm() {
  return (
    <div className="flex min-h-[inherit] flex-col px-7 pb-10 pt-8 sm:px-9 md:px-10 xl:px-12 xl:pb-12 xl:pt-10 min-[1400px]:px-14 min-[1400px]:pt-12">
      <header className="relative z-50 flex items-center justify-between">
        <Logo />
        <LangButton />
      </header>
      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center pb-8 text-center">
        <AuthTitle title="Kodni " accent="tasdiqlang" centered compact />
        <p className="mx-auto mt-3 max-w-[390px] text-center text-[12px] font-medium leading-[1.45] text-joyBlue xl:text-[15px] min-[1400px]:text-[18px]">
          Email yoki telefon raqamingizga yuborilgan 6 xonali tasdiqlash kodini kiriting.
        </p>
        <div className="mt-8 flex justify-center gap-3 min-[1400px]:mt-10">
          {Array.from({ length: 6 }, (_, index) => (
            <input key={index} className="otp-field" maxLength="1" inputMode="numeric" aria-label={`${index + 1}-raqam`} />
          ))}
        </div>
        <div className="mt-8 w-full max-w-[430px]">
          <PrimaryButton type="submit">Tasdiqlash</PrimaryButton>
        </div>
        <p className="mt-5 text-center text-[10px] font-bold text-joyDeep xl:mt-5 xl:text-[12px] min-[1400px]:text-[14px]">
          Kod kelmadimi? <a href="#forgot" className="auth-link">Qayta yuborish</a>
        </p>
      </main>
    </div>
  );
}
