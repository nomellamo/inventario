function TabPanel({ children }) {
  return children
}

function InstitutionsTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function EstablishmentsTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function DependenciesTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function UsersTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function AssistantTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function AssetsTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function TrashTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function ImportsTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function PlanchetasTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

function AuditTabPanel({ children }) {
  return <TabPanel>{children}</TabPanel>
}

export {
  InstitutionsTabPanel,
  EstablishmentsTabPanel,
  DependenciesTabPanel,
  UsersTabPanel,
  AssistantTabPanel,
  AssetsTabPanel,
  TrashTabPanel,
  ImportsTabPanel,
  PlanchetasTabPanel,
  AuditTabPanel,
}
