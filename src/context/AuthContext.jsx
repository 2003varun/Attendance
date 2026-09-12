// Authentication & Role Context
import React, { createContext, useContext, useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';

export const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    EMPLOYEE: "EMPLOYEE"
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [role, setRole] = useState(() => localStorage.getItem("attendance_user_role") || ROLES.ADMIN);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        localStorage.setItem("attendance_user_role", role);
        const syncEmps = employeeService.getAllSync();
        const pickUser = (emps) => {
            if (!emps || !emps.length) return null;
            if (role === ROLES.ADMIN) {
                return emps.find(e => e.id === "378" || e.employee_id === "378") || emps[0];
            } else if (role === ROLES.MANAGER) {
                return emps.find(e => e.id === "75" || e.employee_id === "75") || emps[0];
            } else {
                return emps.find(e => e.id === "428" || e.employee_id === "428") || emps[0];
            }
        };

        setCurrentUser(pickUser(syncEmps));

        employeeService.getAll().then(emps => {
            setCurrentUser(pickUser(emps));
        }).catch(() => {});
    }, [role]);

    const changeRole = (newRole) => {
        if (ROLES[newRole]) {
            setRole(newRole);
        }
    };

    const changeCurrentUser = (employeeId) => {
        const emp = employeeService.getByIdSync(employeeId);
        if (emp) setCurrentUser(emp);
        employeeService.getById(employeeId).then(user => {
            if (user) setCurrentUser(user);
        }).catch(() => {});
    };

    const value = {
        role,
        changeRole,
        currentUser,
        changeCurrentUser,
        isAdmin: role === ROLES.ADMIN,
        isManager: role === ROLES.MANAGER,
        isEmployee: role === ROLES.EMPLOYEE
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
