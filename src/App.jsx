import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminGateProvider } from "./context/AdminGateContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import HomeRedirect from "./components/HomeRedirect";

import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminRestauranteVisual from "./pages/superadmin/SuperAdminRestauranteVisual";
import GarcomHome from "./pages/garcom/GarcomHome";
import CozinhaHome from "./pages/cozinha/CozinhaHome";
import CaixaHome from "./pages/caixa/CaixaHome";
import GestaoHome from "./pages/gestao/GestaoHome";
import AdministracaoHome from "./pages/gestao/AdministracaoHome";
import CardapioAdmin from "./pages/gestao/CardapioAdmin";
import ComandasFisicasAdmin from "./pages/gestao/ComandasFisicasAdmin";
import UsuariosAdmin from "./pages/gestao/UsuariosAdmin";
import InsumosAdmin from "./pages/gestao/InsumosAdmin";
import ReceitasAdmin from "./pages/gestao/ReceitasAdmin";
import ReceitaProdutoEditor from "./pages/gestao/ReceitaProdutoEditor";
import RelatoriosAdmin from "./pages/gestao/RelatoriosAdmin";
import IdentidadeVisualAdmin from "./pages/gestao/IdentidadeVisualAdmin";
import ComandaGarcom from "./pages/garcom/ComandaGarcom";
import AbrirComandaPorQR from "./pages/garcom/AbrirComandaPorQR";
import FechamentoCaixa from "./pages/caixa/FechamentoCaixa";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminGateProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRedirect />} />

              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/superadmin/restaurantes/:restaurantId/visual"
                element={
                  <ProtectedRoute allowedRoles={["super_admin"]}>
                    <SuperAdminRestauranteVisual />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/garcom"
                element={
                  <ProtectedRoute allowedRoles={["garcom", "gestao"]}>
                    <GarcomHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/garcom/comanda/:comandaId"
                element={
                  <ProtectedRoute allowedRoles={["garcom", "gestao"]}>
                    <ComandaGarcom />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/garcom/abrir/:comandaFisicaId"
                element={
                  <ProtectedRoute allowedRoles={["garcom", "gestao"]}>
                    <AbrirComandaPorQR />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cozinha"
                element={
                  <ProtectedRoute allowedRoles={["cozinha", "gestao"]}>
                    <CozinhaHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/caixa"
                element={
                  <ProtectedRoute allowedRoles={["caixa", "garcom", "gestao"]}>
                    <CaixaHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/caixa/comanda/:comandaId"
                element={
                  <ProtectedRoute allowedRoles={["caixa", "garcom", "gestao"]}>
                    <FechamentoCaixa />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <GestaoHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <AdministracaoHome />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/cardapio"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <CardapioAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/comandas-fisicas"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <ComandasFisicasAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/usuarios"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <UsuariosAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/estoque"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <InsumosAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/estoque/receitas"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <ReceitasAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/estoque/receitas/:produtoId"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <ReceitaProdutoEditor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/relatorios"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <RelatoriosAdmin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestao/administracao/identidade-visual"
                element={
                  <ProtectedRoute allowedRoles={["gestao"]}>
                    <IdentidadeVisualAdmin />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </AdminGateProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
