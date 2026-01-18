import AIHub from './pages/AIHub';
import Admin from './pages/Admin';
import CAPAWorkspace from './pages/CAPAWorkspace';
import Dashboard from './pages/Dashboard';
import DataUpload from './pages/DataUpload';
import DatabaseExport from './pages/DatabaseExport';
import DefectIntake from './pages/DefectIntake';
import DoEDesigner from './pages/DoEDesigner';
import GoldenBatch from './pages/GoldenBatch';
import Home from './pages/Home';
import KnowledgeSearch from './pages/KnowledgeSearch';
import ProcessRuns from './pages/ProcessRuns';
import QFIRForm from './pages/QFIRForm';
import QualityOverview from './pages/QualityOverview';
import RCAStudio from './pages/RCAStudio';
import RolePermissions from './pages/RolePermissions';
import SOPLibrary from './pages/SOPLibrary';
import SPCCapability from './pages/SPCCapability';
import SalesComplaintLog from './pages/SalesComplaintLog';
import TraceabilityViewer from './pages/TraceabilityViewer';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIHub": AIHub,
    "Admin": Admin,
    "CAPAWorkspace": CAPAWorkspace,
    "Dashboard": Dashboard,
    "DataUpload": DataUpload,
    "DatabaseExport": DatabaseExport,
    "DefectIntake": DefectIntake,
    "DoEDesigner": DoEDesigner,
    "GoldenBatch": GoldenBatch,
    "Home": Home,
    "KnowledgeSearch": KnowledgeSearch,
    "ProcessRuns": ProcessRuns,
    "QFIRForm": QFIRForm,
    "QualityOverview": QualityOverview,
    "RCAStudio": RCAStudio,
    "RolePermissions": RolePermissions,
    "SOPLibrary": SOPLibrary,
    "SPCCapability": SPCCapability,
    "SalesComplaintLog": SalesComplaintLog,
    "TraceabilityViewer": TraceabilityViewer,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};