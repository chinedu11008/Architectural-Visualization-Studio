import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Download } from 'lucide-react';
import UserDropdown from '../components/UserDropdown';
import { createLocalId, getLocalAssetBlob, MAX_BROWSER_IFC_BYTES, resolveLocalAssetUrl, saveLocalAsset } from '../lib/local-assets';
import {
  BUILDING_ROLE_LABELS,
  BUILDING_TYPES,
  DEFAULT_BUILDING_ROLES,
  DEFAULT_SURROUNDINGS_RULES,
} from '../lib/building-rules';
import { inspectReference, REFERENCE_PALETTE_VERSION, rolesFromPalette } from '../lib/reference-palette';

const IfcViewer = lazy(() => import('../components/IfcViewer'));

async function readApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((item) => item.msg).join('; ')
      : data.detail;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return data;
}

async function uploadAsset(projectId, kind, file) {
  const previewBlocked = kind === 'model' && file.size > MAX_BROWSER_IFC_BYTES;
  const previewWarning = previewBlocked ? 'Preview blocked: this IFC exceeds the 64 MiB browser preview limit.' : '';
  let localAsset;
  try {
    localAsset = await saveLocalAsset(projectId, kind, file);
  } catch {
    localAsset = null;
  }
  if (kind === 'model' && previewBlocked) {
    if (!localAsset) throw new Error('This IFC exceeds the browser upload limit and could not be stored locally.');
    return {
      ...localAsset,
      previewBlocked: true,
      uploadError: [previewWarning, 'Saved locally; server sync skipped above 64 MiB.'].filter(Boolean).join(' '),
    };
  }
  const formData = new FormData();
  formData.append('file', file, file.name);
  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets/${kind}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(8000),
    });
    return {
      ...(await readApiResponse(response)),
      localId: localAsset?.localId,
      localOnly: false,
      previewBlocked,
      uploadError: previewWarning,
    };
  } catch (error) {
    if (!localAsset) throw error;
    return {
      ...localAsset,
      previewBlocked,
      uploadError: [previewWarning, `Server sync unavailable: ${error.message}`].filter(Boolean).join(' '),
    };
  }
}

function inferEnvironment(prompt) {
  const text = prompt.toLowerCase();
  let environment = 'clear';
  if (/\b(overcast|cloudy|cloud|diffuse)\b/.test(text)) environment = 'overcast';
  else if (/\b(golden hour|sunset|dusk|warm evening)\b/.test(text)) environment = 'golden';
  else if (/\b(blue hour|night|twilight)\b/.test(text)) environment = 'blue';
  return environment;
}

function summarizeDetectedModelParts(analysis) {
  const counts = { walls: 0, roofs: 0, windows: 0 };
  for (const element of Object.values(analysis?.elementMetadata || {})) {
    const type = String(element.type || '').toUpperCase();
    if (/IFCWINDOW|IFCCURTAINWALL/.test(type)) counts.windows += 1;
    else if (/IFCROOF/.test(type)) counts.roofs += 1;
    else if (/IFCWALL/.test(type)) counts.walls += 1;
  }
  return Object.entries(counts).filter(([, count]) => count > 0)
    .map(([role, count]) => `${count} ${role}`).join(' · ');
}

export default function Workspace({ project, onUpdateProject, onNavigate }) {
  const [inputPanelOpen, setInputPanelOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [activePanel, setActivePanel] = useState('inputs');
  const [prompt, setPrompt] = useState(project.prompt || project.direction || '');
  const [modelReady, setModelReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [referenceAsset, setReferenceAsset] = useState(project.referenceAsset || null);
  const [localRenderUrls, setLocalRenderUrls] = useState({});
  const [feedback, setFeedback] = useState('');
  const [rendering, setRendering] = useState(false);
  const [activeRenderId, setActiveRenderId] = useState(project.renders?.at(-1)?.id || null);
  const [captureRequest, setCaptureRequest] = useState(null);
  const [camera, setCamera] = useState(project.sceneContext?.camera || 'isometric');
  const [modelUpAxis, setModelUpAxis] = useState(project.sceneContext?.upAxis || 'auto');
  const [lighting, setLighting] = useState(project.sceneContext?.lighting || 'daylight');
  const [materialStyle, setMaterialStyle] = useState(project.referenceAsset ? 'reference' : (project.sceneContext?.materialStyle || 'source'));
  const [sceneOverrides, setSceneOverrides] = useState(project.sceneContext?.overrides || {});
  const [environment, setEnvironment] = useState(project.sceneContext?.environment || 'auto');
  const [groundStyle, setGroundStyle] = useState(project.sceneContext?.ground || 'grass');
  const [referenceHints, setReferenceHints] = useState(null);
  const [referenceRoles, setReferenceRoles] = useState({ ...DEFAULT_BUILDING_ROLES, ...(project.sceneContext?.buildingRoles || {}) });
  const [paletteReferenceId, setPaletteReferenceId] = useState(project.sceneContext?.paletteReferenceId || null);
  const [ifcAnalysis, setIfcAnalysis] = useState(project.ifcAnalysis || null);
  const [visibleStoreyId, setVisibleStoreyId] = useState(project.sceneContext?.visibleStoreyId || '');
  const [surroundingsRules, setSurroundingsRules] = useState(() => ({ ...DEFAULT_SURROUNDINGS_RULES, ...(project.sceneContext?.surroundingsRules || {}) }));
  const [layoutSeed, setLayoutSeed] = useState(project.sceneContext?.layoutSeed || 19);
  const [notice, setNotice] = useState('');
  const renders = (project.renders || [])
    .filter((render) => render.resultAssetId || render.localId)
    .map((render) => ({ ...render, url: localRenderUrls[render.localId] || render.url }));
  const activeRender = renders.find((render) => render.id === activeRenderId);
  const model = project.modelAsset?.kind === 'ifc' ? project.modelAsset : null;
  const referenceName = referenceAsset?.filename || '';
  const inferredEnvironment = useMemo(() => inferEnvironment(prompt), [prompt]);
  const selectedBuildingType = ifcAnalysis?.buildingType?.type || 'other';
  const detectedModelParts = useMemo(() => summarizeDetectedModelParts(ifcAnalysis), [ifcAnalysis]);
  const resolvedSurroundingsRules = useMemo(() => Object.fromEntries(BUILDING_TYPES.map(({ id }) => [
    id,
    { ...DEFAULT_SURROUNDINGS_RULES[id], ...(surroundingsRules[id] || {}) },
  ])), [surroundingsRules]);
  const selectedRule = resolvedSurroundingsRules[selectedBuildingType] || resolvedSurroundingsRules.other;
  const sceneObjects = useMemo(() => ({
    trees: sceneOverrides.trees ?? true,
    shrubs: sceneOverrides.shrubs ?? true,
    cars: sceneOverrides.cars ?? Boolean(selectedRule.vehicles?.length),
    people: sceneOverrides.people ?? true,
    boundary: sceneOverrides.boundary ?? true,
    paths: sceneOverrides.paths ?? true,
    grass: sceneOverrides.grass ?? true,
  }), [sceneOverrides, selectedRule.vehicles]);
  const resolvedEnvironment = environment === 'auto' ? inferredEnvironment : environment;
  const savedContext = activeRender?.presentation?.context_objects;
  const savedContextLabel = savedContext
    ? [savedContext.trees && 'trees', savedContext.shrubs && 'shrubs', savedContext.people && 'people', savedContext.cars && 'vehicles', savedContext.paths && 'paths', savedContext.boundary && 'boundary', savedContext.grass && 'ground'].filter(Boolean).join(' · ')
    : 'no context props';
  const readyToRender = Boolean(model?.id && modelReady && referenceAsset?.id && prompt.trim() && !rendering && !uploading);

  useEffect(() => {
    setPrompt(project.prompt || project.direction || '');
    setReferenceAsset(project.referenceAsset || null);
    setCamera(project.sceneContext?.camera || 'isometric');
    setLighting(project.sceneContext?.lighting || 'daylight');
    setMaterialStyle(project.referenceAsset ? 'reference' : (project.sceneContext?.materialStyle || 'source'));
    setSceneOverrides(project.sceneContext?.overrides || {});
    setEnvironment(project.sceneContext?.environment || 'auto');
    setGroundStyle(project.sceneContext?.ground || 'grass');
    setModelUpAxis(project.sceneContext?.upAxis || 'auto');
    setModelReady(false);
    setIfcAnalysis(project.ifcAnalysis || null);
    setVisibleStoreyId(project.sceneContext?.visibleStoreyId || '');
    setReferenceRoles({ ...DEFAULT_BUILDING_ROLES, ...(project.sceneContext?.buildingRoles || {}) });
    setPaletteReferenceId(project.sceneContext?.paletteReferenceId || null);
    setSurroundingsRules({ ...DEFAULT_SURROUNDINGS_RULES, ...(project.sceneContext?.surroundingsRules || {}) });
    setLayoutSeed(project.sceneContext?.layoutSeed || 19);
    setActiveRenderId(project.renders?.at(-1)?.id || null);
    setCaptureRequest(null);
    setRendering(false);
    setNotice('');
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    const syncServerData = async () => {
      try {
        const [assetsRes, jobsRes] = await Promise.all([
          fetch(`/api/projects/${encodeURIComponent(project.id)}/assets`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
          fetch(`/api/projects/${encodeURIComponent(project.id)}/render-jobs`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
        ]);
        if (cancelled) return;
        const updates = {};
        if (assetsRes?.ok) {
          const assets = await assetsRes.json().catch(() => []);
          const ifcAsset = assets.find((a) => a.kind === 'ifc');
          const refAsset = assets.find((a) => a.kind === 'reference');
          if (ifcAsset && !project.modelAsset) updates.modelAsset = ifcAsset;
          if (refAsset && !project.referenceAsset) updates.referenceAsset = refAsset;
        }
        if (jobsRes?.ok) {
          const jobs = await jobsRes.json().catch(() => []);
          const existingIds = new Set((project.renders || []).map((r) => r.id));
          const completedJobs = jobs
            .filter((j) => j.status === 'complete' && j.result_asset_id && !existingIds.has(j.id))
            .map((j, idx) => ({
              id: j.id,
              name: `Render ${(project.renders?.length || 0) + idx + 1}`,
              prompt: j.prompt,
              modelName: project.modelAsset?.filename || 'IFC model',
              referenceName: project.referenceAsset?.filename || 'Reference image',
              modelAssetId: j.model_asset_id,
              modelSha256: j.model_sha256,
              resultAssetId: j.result_asset_id,
              url: j.result_url,
              meshCount: 0,
              presentation: j.presentation,
              createdAt: j.created_at,
              localOnly: false,
            }));
          if (completedJobs.length > 0) {
            updates.renders = [...(project.renders || []), ...completedJobs];
          }
        }
        if (!cancelled && Object.keys(updates).length > 0) {
          onUpdateProject(updates);
          if (updates.referenceAsset && !referenceAsset) {
            setReferenceAsset(updates.referenceAsset);
          }
        }
      } catch {
        // Offline or API unavailable
      }
    };
    syncServerData();
    return () => { cancelled = true; };
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    const restoreLocalUrls = async () => {
      const reference = project.referenceAsset;
      if (reference?.localId) {
        const url = await resolveLocalAssetUrl(reference.localId);
        if (!cancelled && url) setReferenceAsset({ ...reference, url });
      }
      const localRenders = await Promise.all((project.renders || []).map(async (render) => (
        render.localId ? [render.localId, await resolveLocalAssetUrl(render.localId)] : null
      )));
      if (!cancelled) setLocalRenderUrls((current) => ({
        ...current,
        ...Object.fromEntries(localRenders.filter((entry) => entry?.[1])),
      }));
    };
    restoreLocalUrls();
    return () => { cancelled = true; };
  }, [project.id, project.referenceAsset?.localId, project.renders]);

  useEffect(() => {
    let cancelled = false;
    if (!referenceAsset?.url) {
      setReferenceHints(null);
      return undefined;
    }
    const inspect = async () => {
      const localBlob = referenceAsset.localId
        ? await getLocalAssetBlob(referenceAsset.localId).catch(() => null)
        : null;
      return inspectReference(localBlob || referenceAsset.url);
    };
    inspect().then((hints) => {
      if (cancelled) return;
      setReferenceHints(hints);
      const storedRoles = project.sceneContext?.buildingRoles || {};
      if (referenceAsset.id !== paletteReferenceId || project.sceneContext?.referencePaletteVersion !== REFERENCE_PALETTE_VERSION || !storedRoles.glazing) {
        const roles = { ...rolesFromPalette(hints.palette), ...storedRoles };
        setReferenceRoles(roles);
        setMaterialStyle('reference');
        setPaletteReferenceId(referenceAsset.id);
        setActiveRenderId(null);
        onUpdateProject({ sceneContext: { ...project.sceneContext, buildingRoles: roles, paletteReferenceId: referenceAsset.id, referencePaletteVersion: REFERENCE_PALETTE_VERSION, materialStyle: 'reference' } });
      }
    });
    return () => { cancelled = true; };
  }, [onUpdateProject, paletteReferenceId, project.sceneContext, referenceAsset?.id, referenceAsset?.url]);

  const setCameraPreference = (value) => {
    setCamera(value);
    onUpdateProject({ sceneContext: { ...project.sceneContext, camera: value, lighting, materialStyle, environment, ground: groundStyle, upAxis: modelUpAxis, overrides: sceneOverrides } });
  };

  const setLightingPreference = (value) => {
    setLighting(value);
    onUpdateProject({ sceneContext: { ...project.sceneContext, camera, lighting: value, materialStyle, environment, ground: groundStyle, upAxis: modelUpAxis, overrides: sceneOverrides } });
  };

  const setMaterialStylePreference = (value) => {
    setMaterialStyle(value);
    setActiveRenderId(null);
    onUpdateProject({ sceneContext: { ...project.sceneContext, camera, lighting, materialStyle: value, environment, ground: groundStyle, upAxis: modelUpAxis, overrides: sceneOverrides } });
  };

  const setEnvironmentPreference = (value) => {
    setEnvironment(value);
    onUpdateProject({ sceneContext: { ...project.sceneContext, camera, lighting, materialStyle, environment: value, ground: groundStyle, upAxis: modelUpAxis, overrides: sceneOverrides } });
  };

  const setGroundPreference = (value) => {
    setGroundStyle(value);
    onUpdateProject({ sceneContext: { ...project.sceneContext, camera, lighting, materialStyle, environment, ground: value, upAxis: modelUpAxis, overrides: sceneOverrides } });
  };

  const setContextObject = (key, enabled) => {
    const overrides = { ...sceneOverrides, [key]: enabled };
    setSceneOverrides(overrides);
    setActiveRenderId(null);
    onUpdateProject({ sceneContext: { ...project.sceneContext, overrides } });
  };

  const saveRoleAssignments = (roles) => {
    setReferenceRoles(roles);
    setMaterialStyle('reference');
    setActiveRenderId(null);
    onUpdateProject({ sceneContext: { ...project.sceneContext, buildingRoles: roles, materialStyle: 'reference' } });
  };

  const updateBuildingRole = (role, color) => saveRoleAssignments({ ...referenceRoles, [role]: color });

  const handleViewerReady = useCallback(({ analysis }) => {
    setModelReady(true);
    setIfcAnalysis(analysis);
    onUpdateProject({ ifcAnalysis: analysis });
  }, [onUpdateProject]);

  useEffect(() => {
    setModelReady(false);
    setIfcAnalysis(null);
  }, [model?.id]);

  const handleModelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (extension !== '.ifc') {
      setNotice('For this IFC-first version, export your Revit or Archicad model as IFC4 or IFC2x3.');
      event.target.value = '';
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      setNotice('IFC files larger than 300 MiB cannot be stored in the browser.');
      event.target.value = '';
      return;
    }
    setUploading(true);
    setNotice(`Uploading ${file.name} to the local IFC service…`);
    try {
      const asset = await uploadAsset(project.id, 'model', file);
      onUpdateProject({ modelAsset: asset, ifcAnalysis: null, renders: [] });
      setActiveRenderId(null);
      setNotice(asset.uploadError
        ? `${asset.filename} · ${asset.uploadError}`
        : asset.localOnly
          ? `${asset.filename} saved on this device · local API unavailable (${asset.uploadError || 'offline'}).`
          : `${asset.filename} uploaded · saved on this device for offline use.`);
    } catch (error) {
      setNotice(error.message || 'IFC upload failed. Start the local API and retry.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleReferenceUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setNotice(`Uploading ${file.name}…`);
    try {
      const asset = await uploadAsset(project.id, 'reference', file);
      setReferenceAsset(asset);
      setMaterialStyle('reference');
      setPaletteReferenceId(null);
      setActiveRenderId(null);
      onUpdateProject({
        referenceAsset: asset,
        sceneContext: { ...project.sceneContext, materialStyle: 'reference' },
      });
      setNotice(asset.localOnly
        ? `${asset.filename} saved on this device · local API unavailable.`
        : `${asset.filename} saved as this project's reference and cached for offline use.`);
    } catch (error) {
      setNotice(error.message || 'Reference image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const saveDirection = () => {
    if (!prompt.trim()) return;
    const version = {
      id: Date.now(),
      text: prompt.trim(),
      createdAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      modelName: model?.filename || 'No IFC selected',
      referenceName,
    };
    onUpdateProject({ prompt: prompt.trim(), direction: prompt.trim(), versions: [...(project.versions || []), version], status: 'In review' });
    setNotice('Prompt snapshot saved.');
  };

  const generateRender = async () => {
    if (!readyToRender) return;
    setRendering(true);
    if (model.localOnly || referenceAsset.localOnly) {
      setCaptureRequest({ id: createLocalId(), modelSha256: model.sha256 || '', localOnly: true });
      setNotice('Rendering and saving locally on this device.');
      return;
    }
    setNotice('Creating an immutable-geometry render job…');
    let jobId;
    try {
      const created = await readApiResponse(await fetch('/api/render-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          model_asset_id: model.id,
          reference_asset_id: referenceAsset.id,
          prompt: prompt.trim(),
          presentation: {
            camera,
            lighting,
            material_style: materialStyle,
            reference_palette: referenceHints?.palette || [],
            building_roles: referenceRoles,
            visible_storey_id: visibleStoreyId,
            building_type: selectedBuildingType,
            surroundings_rules: resolvedSurroundingsRules,
            layout_seed: layoutSeed,
            environment: resolvedEnvironment,
            ground: groundStyle,
            context_objects: {
              trees: Boolean(sceneObjects.trees),
              shrubs: Boolean(sceneObjects.shrubs),
              cars: Boolean(sceneObjects.cars),
              people: Boolean(sceneObjects.people),
              boundary: Boolean(sceneObjects.boundary),
              paths: Boolean(sceneObjects.paths),
              grass: Boolean(sceneObjects.grass),
            },
          },
        }),
      }));
      jobId = created.id;
      const started = await readApiResponse(await fetch(`/api/render-jobs/${created.id}/start`, { method: 'POST' }));
      setNotice(`Rendering IFC source geometry · job ${started.id.slice(0, 8)}…`);
      setCaptureRequest({ id: started.id, modelSha256: model.sha256 });
    } catch (error) {
      if (jobId) {
        fetch(`/api/render-jobs/${jobId}/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message || 'Render could not start.' }),
        }).catch(() => {});
      }
      if (model.localId && referenceAsset.localId) {
        setCaptureRequest({
          id: createLocalId(),
          modelSha256: model.sha256 || '',
          localOnly: true,
        });
        setNotice(`Local render mode · API unavailable (${error.message || 'offline'}).`);
      } else {
        setRendering(false);
        setNotice(error.message || 'Render job could not start.');
      }
    }
  };

  const captureSnapshot = () => {
    setActiveRenderId(null);
    generateRender();
  };

  const handleViewerCapture = useCallback(async (jobId, imageBlob, meshCount, dimensions, error) => {
    if (!model || !captureRequest || captureRequest.id !== jobId) return;
    if (error || !imageBlob) {
      setRendering(false);
      setCaptureRequest(null);
      setNotice(error?.message || 'Render capture failed.');
      return;
    }
    const localAsset = await saveLocalAsset(
      project.id,
      'render',
      new File([imageBlob], `render-${jobId}.png`, { type: 'image/png' }),
    ).catch(() => null);
    const saveRenderToProject = (render) => {
      onUpdateProject({
        prompt: prompt.trim(),
        direction: prompt.trim(),
        renders: [...renders, render],
        status: 'In review',
      });
      setActiveRenderId(render.id);
      setCaptureRequest(null);
      setRendering(false);
      setNotice(`Render saved locally · ${meshCount.toLocaleString()} IFC meshes.`);
    };
    if (captureRequest.localOnly) {
      if (!localAsset) {
        setRendering(false);
        setCaptureRequest(null);
        setNotice('The browser could not store this snapshot. Check available device storage.');
        return;
      }
      saveRenderToProject({
        id: jobId,
        name: `Render ${renders.length + 1}`,
        prompt: prompt.trim(),
        modelName: model.filename,
        referenceName,
        modelAssetId: model.id,
        modelSha256: model.sha256 || '',
        resultAssetId: localAsset.id,
        localId: localAsset.localId,
        url: localAsset.url,
        meshCount,
        presentation: {
          camera,
          lighting,
          material_style: materialStyle,
          building_roles: referenceRoles,
          visible_storey_id: visibleStoreyId,
          building_type: selectedBuildingType,
          surroundings_rules: resolvedSurroundingsRules,
          layout_seed: layoutSeed,
          environment: resolvedEnvironment,
          ground: groundStyle,
          context_objects: {
            trees: Boolean(sceneObjects.trees),
            shrubs: Boolean(sceneObjects.shrubs),
            cars: Boolean(sceneObjects.cars),
            people: Boolean(sceneObjects.people),
            boundary: Boolean(sceneObjects.boundary),
            paths: Boolean(sceneObjects.paths),
            grass: Boolean(sceneObjects.grass),
          },
        },
        createdAt: new Date().toISOString(),
        localOnly: true,
      });
      return;
    }
    const formData = new FormData();
    formData.append('metadata', JSON.stringify({
      model_sha256: captureRequest.modelSha256,
      width: dimensions.width,
      height: dimensions.height,
    }));
    formData.append('image', imageBlob, `render-${jobId}.png`);
    try {
      const completed = await readApiResponse(await fetch(`/api/render-jobs/${jobId}/complete`, {
        method: 'POST',
        body: formData,
      }));
      const render = {
        id: completed.id,
        name: `Render ${renders.length + 1}`,
        prompt: prompt.trim(),
        modelName: model.filename,
        referenceName,
        modelAssetId: model.id,
        modelSha256: completed.model_sha256,
        resultAssetId: completed.result_asset_id,
        localId: localAsset?.localId,
        url: localAsset?.url || completed.result_url,
        meshCount,
        presentation: completed.presentation,
        createdAt: completed.created_at,
        localOnly: false,
      };
      onUpdateProject({
        prompt: prompt.trim(),
        direction: prompt.trim(),
        renders: [...renders, render],
        status: 'In review',
      });
      setActiveRenderId(render.id);
      setCaptureRequest(null);
      setRendering(false);
      setNotice(`Render saved · ${meshCount.toLocaleString()} IFC meshes · IFC file integrity verified.`);
    } catch (apiError) {
      fetch(`/api/render-jobs/${jobId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: apiError.message || 'Render result could not be saved.' }),
      }).catch(() => {});
      if (localAsset) {
        saveRenderToProject({
          id: jobId,
          name: `Render ${renders.length + 1}`,
          prompt: prompt.trim(),
          modelName: model.filename,
          referenceName,
          modelAssetId: model.id,
          modelSha256: model.sha256 || '',
          resultAssetId: localAsset.id,
          localId: localAsset.localId,
          url: localAsset.url,
          meshCount,
          presentation: {
            camera,
            lighting,
            material_style: materialStyle,
            building_roles: referenceRoles,
            visible_storey_id: visibleStoreyId,
            building_type: selectedBuildingType,
            surroundings_rules: resolvedSurroundingsRules,
            layout_seed: layoutSeed,
            environment: resolvedEnvironment,
            ground: groundStyle,
            context_objects: {
              trees: Boolean(sceneObjects.trees),
              shrubs: Boolean(sceneObjects.shrubs),
              cars: Boolean(sceneObjects.cars),
              people: Boolean(sceneObjects.people),
              boundary: Boolean(sceneObjects.boundary),
              paths: Boolean(sceneObjects.paths),
              grass: Boolean(sceneObjects.grass),
            },
          },
          createdAt: new Date().toISOString(),
          localOnly: true,
        });
      } else {
        setRendering(false);
        setCaptureRequest(null);
        setNotice(apiError.message || 'The render result could not be saved.');
      }
    }
  }, [camera, captureRequest, groundStyle, visibleStoreyId, layoutSeed, lighting, materialStyle, model, onUpdateProject, project.id, prompt, referenceName, referenceRoles, renders, resolvedEnvironment, resolvedSurroundingsRules, sceneObjects, selectedBuildingType]);

  const addFeedback = (event) => {
    event.preventDefault();
    if (!feedback.trim()) return;
    const note = { id: Date.now(), text: feedback.trim(), createdAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) };
    onUpdateProject({ feedback: [...(project.feedback || []), note] });
    setFeedback('');
    setNotice('Review note added.');
  };

  const exportBrief = () => {
    const brief = [
      `${project.name || 'Untitled Project'} — Visualization brief`,
      `Client: ${project.client || 'New client'}`,
      `Project type: ${project.type || 'Residential'}`,
      `Status: ${project.status || 'In progress'}`,
      `Model: ${model?.filename || 'Not selected'}`,
      `Reference image: ${referenceName || 'Not selected'}`,
      '',
      'PROMPT',
      prompt || 'No prompt added yet.',
      '',
      'RENDER HISTORY',
      ...(renders.length ? renders.map((render) => `- ${render.name}: ${render.prompt} (${render.createdAt})`) : ['No previews generated yet.']),
      '',
      'CLIENT FEEDBACK',
      ...(project.feedback?.length ? project.feedback.map((note) => `- ${note.text} (${note.createdAt})`) : ['No feedback recorded yet.']),
      '',
      'Lumen / Field prototype export. BIM geometry rendering requires a connected render engine.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-visualization-brief.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Visualization brief downloaded.');
  };

  const selectRender = (render) => {
    setActiveRenderId(render?.id || null);
    if (render) {
      setPrompt(render.prompt);
      if (render.presentation) {
        if (render.presentation.camera) setCamera(render.presentation.camera);
        if (render.presentation.lighting) setLighting(render.presentation.lighting);
        if (render.presentation.material_style) setMaterialStyle(render.presentation.material_style);
        if (render.presentation.environment) setEnvironment(render.presentation.environment);
        if (render.presentation.ground) setGroundStyle(render.presentation.ground);
        if (render.presentation.visible_storey_id !== undefined) setVisibleStoreyId(render.presentation.visible_storey_id || '');
        if (render.presentation.context_objects) setSceneOverrides(render.presentation.context_objects);
      }
    }
  };

  return (
    <div className="w-screen max-w-full min-w-0 h-screen bg-surface flex flex-col overflow-hidden">
      <header className="mobile-safe-top border-b border-line flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-surface shrink-0 gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <button onClick={() => onNavigate('dashboard')} aria-label="Project desk" className="bg-primary rounded-[4px] w-7 h-7 shrink-0" />
          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-ink font-bold text-[14px] leading-5">Lumen / Field</span>
            <span className="text-muted text-[10px] truncate">BIM visualization studio</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] min-w-0 flex-1 justify-center">
          <button onClick={() => onNavigate('dashboard')} className="text-muted hover:text-accent">Project desk</button>
          <span className="text-line">/</span>
          <span className="text-ink-2 truncate max-w-[220px]">{project.name}</span>
          <span className="text-line">/</span>
          <span className="text-muted truncate">{model?.filename || 'No IFC selected'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] ${project.status === 'Approved' ? 'text-green-300' : 'text-accent'}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{project.status}</span>
          <button onClick={exportBrief} aria-label="Export project brief" title="Export project brief" className="hidden sm:flex border border-line items-center justify-center rounded-[4px] w-8 h-8 text-muted hover:border-line-hover">↓</button>
          <button onClick={() => setInputPanelOpen(!inputPanelOpen)} aria-label={inputPanelOpen ? 'Close scene panel' : 'Open scene panel'} title="Toggle scene panel" className={`border flex items-center justify-center rounded-[4px] w-8 h-8 text-[13px] transition-colors ${inputPanelOpen ? 'border-primary bg-primary text-on-primary' : 'border-line text-muted hover:border-line-hover'}`}>☰</button>
          <UserDropdown onNavigate={onNavigate} />
        </div>
      </header>

      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-line-2 bg-page text-[11px] overflow-x-auto whitespace-nowrap shrink-0">
        <button onClick={() => onNavigate('dashboard')} className="text-muted">Project desk</button>
        <span className="text-line">/</span>
        <span className="text-ink-2">{project.name}</span>
        <span className="text-line">/</span>
        <span className="text-muted">{project.status}</span>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {inputPanelOpen && (
          <>
            <button aria-label="Close scene panel" onClick={() => setInputPanelOpen(false)} className="md:hidden fixed inset-0 bg-black/45 z-20" />
            <aside className="fixed md:relative bottom-0 left-0 right-0 z-30 md:z-auto md:w-[320px] lg:w-[340px] max-h-[82vh] md:max-h-none md:h-full shrink-0 overflow-y-auto bg-surface border-t md:border-t-0 md:border-r border-line rounded-t-[10px] md:rounded-none flex flex-col">
              <div className="md:hidden flex justify-center pt-2"><span className="w-8 h-1 rounded-full bg-line" /></div>
              <div className="flex items-start justify-between px-4 pt-4 pb-3">
                <div>
                  <p className="text-muted-2 text-[10px] uppercase">Scene setup</p>
                  <h2 className="text-ink font-bold text-[14px] mt-0.5">{project.name}</h2>
                </div>
                <button onClick={() => setInputPanelOpen(false)} aria-label="Close scene panel" className="md:hidden text-muted text-lg">×</button>
              </div>
              <div className="flex border-b border-line px-3 gap-1" role="tablist" aria-label="Studio panel">
                <button role="tab" aria-selected={activePanel === 'inputs'} onClick={() => setActivePanel('inputs')} className={`px-3 py-2 text-[11px] border-b-2 ${activePanel === 'inputs' ? 'text-accent border-primary' : 'text-muted border-transparent'}`}>Inputs</button>
                <button role="tab" aria-selected={activePanel === 'review'} onClick={() => setActivePanel('review')} className={`px-3 py-2 text-[11px] border-b-2 ${activePanel === 'review' ? 'text-accent border-primary' : 'text-muted border-transparent'}`}>Review{project.feedback?.length ? ` · ${project.feedback.length}` : ''}</button>
              </div>

              {activePanel === 'inputs' ? (
                <div className="flex flex-col px-4 py-4 gap-5">
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted text-[10px] uppercase">01 · IFC model</span>
                      <span className="text-muted-2 text-[9px]">IFC4 · IFC2x3</span>
                    </div>
                    {model ? (
                      <div className="border border-line rounded-[5px] p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[4px] bg-sunken border border-line flex items-center justify-center text-accent text-[11px] shrink-0">3D</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink text-[11px] truncate">{model.filename}</p>
                          <p className="text-muted text-[9px] mt-1">{((model.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MiB · {model.previewBlocked ? 'preview blocked' : modelReady ? 'geometry loaded' : 'loading geometry'}</p>
                        </div>
                        <button onClick={() => { setModelReady(false); onUpdateProject({ modelAsset: null, renders: [] }); setActiveRenderId(null); }} aria-label="Remove model" className="text-muted hover:text-ink">×</button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-line rounded-[5px] px-3 py-4 text-center">
                        <p className="text-ink-3 text-[11px]">Choose an IFC building model</p>
                        <p className="text-muted text-[9px] mt-1">Export IFC4 or IFC2x3 from Revit or Archicad.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <label className="border border-line rounded-[4px] text-accent text-[10px] py-2 text-center cursor-pointer hover:border-accent">
                        {uploading ? 'Uploading…' : '+ Choose IFC file'}
                        <input type="file" accept=".ifc,application/x-step" onChange={handleModelUpload} className="sr-only" disabled={uploading} />
                      </label>
                      <span className="border border-line rounded-[4px] text-muted text-[9px] py-2 text-center">Preview &lt;= 64 MiB</span>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted text-[10px] uppercase">02 · Reference image</span>
                      <span className="text-muted-2 text-[9px]">Style + atmosphere</span>
                    </div>
                    {referenceAsset && <div className="relative h-[120px] rounded-[5px] overflow-hidden border border-line">
                      <img src={referenceAsset.url} alt="Selected architectural reference" className="w-full h-full object-cover" />
                      <span className="absolute bottom-2 left-2 max-w-[90%] truncate bg-chip text-accent text-[9px] px-2 py-1 rounded-[3px]">{referenceName}</span>
                    </div>}
                    <label className="mt-2 w-full border border-line rounded-[4px] text-accent text-[10px] py-2 text-center cursor-pointer block hover:border-accent">
                      ↑ Upload reference image
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleReferenceUpload} className="sr-only" disabled={uploading} />
                    </label>
                    <div className="mt-3 flex flex-col gap-1.5">
                      <p className="text-muted text-[9px] uppercase">Suggested reference palette · building + scene</p>
                      {referenceHints?.palette?.length > 0
                        ? <div className="flex items-center gap-1.5">{referenceHints.palette.map((color) => <span key={color} title={color} className="w-5 h-5 border border-line rounded-sm" style={{ backgroundColor: color }} />)}</div>
                        : <p className="text-muted text-[9px]">{referenceHints?.error || (referenceAsset ? 'No usable colours found in the reference image.' : 'Upload a reference to suggest facade colours.')}</p>}
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(BUILDING_ROLE_LABELS).map(([role, label]) => <label key={role} className="flex items-center justify-between gap-1.5 text-[9px] text-ink-3">
                          <span>{label}</span><input type="color" value={referenceRoles[role] || DEFAULT_BUILDING_ROLES[role]} onChange={(event) => updateBuildingRole(role, event.target.value)} className="w-7 h-6 p-0.5 bg-page border border-line rounded cursor-pointer" />
                        </label>)}
                      </div>
                      {detectedModelParts && <p className="text-muted text-[9px]">IFC parts detected · {detectedModelParts}</p>}
                      <p className="text-muted text-[9px]">Reference colours map to wall, roof, trim, door and window roles. Sampled foliage, bark, paving and vehicle tones also guide added scene objects with material-specific textures.</p>
                    </div>
                  </section>

                  <section>
                    <p className="text-muted text-[10px] uppercase mb-2">03 · Scene styling</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ifcAnalysis?.storeys?.length > 0 && <label className="text-muted text-[9px] flex flex-col gap-1 col-span-2">Visible floor
                        <select value={visibleStoreyId} onChange={(event) => {
                          const id = event.target.value;
                          setVisibleStoreyId(id);
                          onUpdateProject({ sceneContext: { ...project.sceneContext, visibleStoreyId: id } });
                        }} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="">All floors</option>
                          {ifcAnalysis.storeys.map((storey) => <option key={storey.id} value={String(storey.id)}>{storey.name}</option>)}
                        </select>
                      </label>}
                      <label className="text-muted text-[9px] flex flex-col gap-1">Camera
                        <select value={camera} onChange={(event) => setCameraPreference(event.target.value)} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="isometric">Isometric</option><option value="eye-level">Eye level</option><option value="top">Top</option>
                        </select>
                      </label>
                      <label className="text-muted text-[9px] flex flex-col gap-1">Model up axis
                        <select value={modelUpAxis} onChange={(event) => {
                          const upAxis = event.target.value;
                          setModelUpAxis(upAxis);
                          onUpdateProject({ sceneContext: { ...project.sceneContext, camera, lighting, materialStyle, environment, ground: groundStyle, upAxis, overrides: sceneOverrides } });
                        }} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="auto">IFC metadata</option><option value="2">Z up</option><option value="1">Y up</option><option value="0">X up</option>
                        </select>
                      </label>
                      <label className="text-muted text-[9px] flex flex-col gap-1">Light
                        <select value={lighting} onChange={(event) => setLightingPreference(event.target.value)} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="daylight">Daylight</option><option value="overcast">Overcast</option><option value="golden">Golden hour</option><option value="blue">Blue hour</option>
                        </select>
                      </label>
                      <label className="text-muted text-[9px] flex flex-col gap-1 col-span-2">Environment
                        <select value={environment} onChange={(event) => setEnvironmentPreference(event.target.value)} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="auto">Match prompt · {inferredEnvironment}</option><option value="clear">Clear sky</option><option value="overcast">Overcast sky</option><option value="golden">Golden hour</option><option value="blue">Blue hour</option>
                        </select>
                      </label>
                      <label className="text-muted text-[9px] flex flex-col gap-1 col-span-2">Ground
                        <select value={groundStyle} onChange={(event) => setGroundPreference(event.target.value)} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="grass">Grass</option><option value="gravel">Gravel</option><option value="paving">Paving</option>
                        </select>
                      </label>
                      <label className="text-muted text-[9px] flex flex-col gap-1 col-span-2">Material appearance
                        <select value={materialStyle} onChange={(event) => setMaterialStylePreference(event.target.value)} className="bg-page border border-line rounded-[4px] px-2 py-2 text-ink-2 text-[10px] outline-none focus:border-accent">
                          <option value="reference">Reference palette</option><option value="source">IFC source colors</option><option value="warm">Warm stone</option><option value="timber">Timber</option><option value="concrete">Concrete</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 border-t border-line pt-2">
                      <p className="text-muted text-[9px] uppercase mb-1">Site objects · reference styled</p>
                      {[
                        { key: 'trees', label: 'Trees' },
                        { key: 'shrubs', label: 'Shrubs' },
                        { key: 'cars', label: 'Vehicles' },
                        { key: 'people', label: 'People' },
                        { key: 'boundary', label: 'Boundary / fence' },
                        { key: 'paths', label: 'Paths' },
                        { key: 'grass', label: 'Site ground' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between gap-2 text-[10px] text-ink-3 py-1">
                          <span>{label}</span>
                          <input type="checkbox" checked={Boolean(sceneObjects[key])} onChange={(event) => setContextObject(key, event.target.checked)} className="accent-[var(--c-primary)]" />
                        </label>
                      ))}
                      <p className="text-muted text-[9px] leading-4">Added objects use the sampled reference palette and material textures. IFC geometry stays unchanged.</p>
                    </div>
                    <p className="text-muted text-[9px] leading-4 mt-2">Environment and props are presentation layers. Source IFC vertices, dimensions, and placements remain locked.</p>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="render-prompt" className="text-muted text-[10px] uppercase">04 · Render prompt</label>
                      <span className="text-muted-2 text-[9px]">{prompt.length} / 1200</span>
                    </div>
                    <textarea id="render-prompt" maxLength={1200} value={prompt} onChange={(event) => setPrompt(event.target.value)} onBlur={() => onUpdateProject({ prompt, direction: prompt })} placeholder="Describe the light, materials, landscape, camera, and mood…" className="w-full h-[132px] resize-y bg-page border border-line rounded-[5px] p-3 text-ink-2 text-[11px] leading-[18px] outline-none focus:border-accent placeholder:text-muted-2" />
                    <p className="text-muted text-[9px] mt-1">Describe the setting; geometry is not prompt-editable.</p>
                  </section>

                  <div className="flex flex-col gap-2 pb-4">
                    <button onClick={saveDirection} disabled={!prompt.trim()} className="w-full border border-line rounded-[5px] text-accent text-[11px] py-2 hover:border-accent disabled:opacity-40">Save prompt snapshot</button>
                    <button onClick={generateRender} disabled={!readyToRender} className={`w-full flex items-center justify-center gap-2 py-3 rounded-[5px] font-medium text-[12px] transition-colors ${readyToRender ? 'bg-primary text-on-primary hover:bg-primary-hover' : 'bg-sunken text-muted cursor-not-allowed'}`}>
                      {rendering ? <><span className="animate-spin">◌</span> Rendering locked geometry…</> : '✦ Render IFC model'}
                    </button>
                    {!readyToRender && <p className="text-muted text-[9px] text-center">Upload an IFC and reference image, then wait for geometry loading.</p>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col px-4 py-4 gap-4 overflow-y-auto">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-muted text-[10px] uppercase">Client review</p><p className="text-ink text-[12px] font-bold mt-1">{project.status}</p></div>
                    {project.status === 'Approved' ? (
                      <button onClick={() => onUpdateProject({ status: 'In review' })} className="border border-line text-ink-3 px-2 py-1.5 rounded-[4px] text-[9px]">Reopen</button>
                    ) : (
                      <button onClick={() => { onUpdateProject({ status: 'Approved' }); setNotice('Direction approved.'); }} className="bg-primary text-on-primary px-2 py-1.5 rounded-[4px] text-[9px]">✓ Approve</button>
                    )}
                  </div>
                  <form onSubmit={addFeedback} className="flex flex-col gap-2">
                    <label htmlFor="feedback" className="text-muted text-[10px]">Add client feedback</label>
                    <textarea id="feedback" maxLength={500} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="e.g. Try warmer timber and less contrast…" className="w-full min-h-[86px] resize-y bg-page border border-line rounded-[5px] p-3 text-ink-2 text-[11px] leading-[18px] outline-none focus:border-accent placeholder:text-muted-2" />
                    <button type="submit" disabled={!feedback.trim()} className="self-end border border-line text-accent px-3 py-2 rounded-[4px] text-[10px] disabled:opacity-40">+ Add note</button>
                  </form>
                  <div className="border-t border-line-2 pt-3 flex flex-col gap-3">
                    <p className="text-muted text-[10px] uppercase">Feedback · {project.feedback?.length || 0}</p>
                    {project.feedback?.length ? [...project.feedback].reverse().map((note) => (
                      <article key={note.id} className="border-l-2 border-primary pl-3 py-1">
                        <p className="text-ink-2 text-[11px] leading-[18px]">{note.text}</p>
                        <time className="text-muted text-[9px] mt-1 block">{note.createdAt}</time>
                      </article>
                    )) : <p className="text-muted text-[10px]">No client notes yet.</p>}
                  </div>
                  <div className="border-t border-line-2 pt-3 flex flex-col gap-2">
                    <p className="text-muted text-[10px] uppercase">Prompt history · {project.versions?.length || 0}</p>
                    {[...(project.versions || [])].reverse().slice(0, 4).map((version, index) => (
                      <article key={version.id} className="border-l-2 border-line pl-3 py-1">
                        <p className="text-ink-3 text-[10px] leading-[16px]">{version.text}</p>
                        <time className="text-muted text-[9px] mt-1 block">{index === 0 ? 'Latest' : version.createdAt}</time>
                      </article>
                    ))}
                  </div>
                  {notice && <p role="status" className="text-accent text-[10px]">{notice}</p>}
                </div>
              )}
            </aside>
          </>
        )}

        <section className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="border-b border-line flex items-center justify-between px-3 sm:px-4 py-2 bg-surface shrink-0 gap-2">
            <span className="text-muted-2 text-[10px] sm:text-[11px] truncate">{activeRender ? `${activeRender.name} · ${project.name}` : `IFC 3D view · ${project.name}`}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-muted text-[9px]">{activeRender ? (activeRender.localOnly ? 'Saved on this device' : 'IFC file integrity verified') : modelReady ? 'IFC geometry loaded' : 'Ready for IFC'}</span>
              <button onClick={exportBrief} aria-label="Export visualization brief" title="Export visualization brief" className="sm:hidden border border-line rounded-[4px] w-7 h-7 text-muted">↓</button>
              <button onClick={exportBrief} className="hidden sm:block border border-line rounded-[4px] px-2.5 py-1 text-muted text-[10px] hover:border-line-hover">↓ Export brief</button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center bg-page p-3 sm:p-6 lg:p-8 overflow-hidden">
            <div className="relative w-full max-w-[1120px] aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-[5px] border border-line bg-page">
              <Suspense fallback={<p className="absolute inset-0 grid place-items-center text-muted text-[11px]">Loading IFC viewer…</p>}>
                <IfcViewer
                  asset={model}
                  referenceUrl={referenceAsset?.url}
                  camera={camera}
                  lighting={lighting}
                  materialStyle={materialStyle}
                  upAxisPreference={modelUpAxis}
                  referenceRoles={referenceRoles}
                  referenceStyle={referenceHints?.contextStyle}
                  environment={resolvedEnvironment}
                  groundStyle={groundStyle}
                  contextObjects={sceneObjects}
                  buildingType={selectedBuildingType}
                  surroundingsRules={resolvedSurroundingsRules}
                  layoutSeed={layoutSeed}
                  entrance={ifcAnalysis?.entrance}
                  visibleStoreyId={visibleStoreyId}
                  captureRequest={captureRequest}
                  onStatus={setNotice}
                  onReady={handleViewerReady}
                  onCapture={handleViewerCapture}
                />
              </Suspense>
              {activeRender && activeRender.url && <div className="absolute inset-0 z-10 pointer-events-none">
                <img src={activeRender.url} alt={`Fixed-geometry IFC render ${activeRender.name}`} className="absolute inset-0 w-full h-full object-contain bg-page" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                <div className="absolute top-3 left-3 bg-chip text-accent text-[9px] uppercase px-2 py-1 rounded-[3px]">IFC geometry rendered · {activeRender.meshCount?.toLocaleString()} meshes · {activeRender.localOnly ? 'saved locally' : 'IFC file integrity verified'}</div>
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 flex items-end justify-between gap-3">
                  <div className="min-w-0"><p className="text-white font-medium text-[12px] sm:text-[14px]">{activeRender.name} · {project.name}</p><p className="text-white/75 text-[10px] sm:text-[11px] line-clamp-2 mt-1">{activeRender.prompt}</p></div>
                  <span className="shrink-0 bg-black/45 text-white/80 text-[9px] px-2 py-1 rounded-[3px] hidden sm:block">{savedContextLabel} · context separate</span>
                </div>
              </div>}
              {(modelReady || activeRender?.url) && <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                {modelReady && <button onClick={captureSnapshot} disabled={!readyToRender} title={readyToRender ? 'Capture a new environment snapshot' : 'Add a prompt and required inputs before capturing'} aria-label="Capture a new environment snapshot" className="flex items-center gap-2 border border-white/20 bg-black/65 text-white px-3 py-2 rounded-[4px] text-[10px] hover:bg-black/80 disabled:opacity-50">
                  <Camera size={15} strokeWidth={1.8} />
                  <span>{rendering ? 'Capturing…' : 'Snapshot'}</span>
                </button>}
                {activeRender?.url && <a href={activeRender.url} download={`${(project.name || 'render').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(activeRender.name || 'render').toLowerCase().replace(/\s+/g, '-')}.png`} title={`Download ${activeRender.name}`} aria-label={`Download ${activeRender.name}`} className="pointer-events-auto flex items-center justify-center border border-white/20 bg-black/65 text-white w-9 h-9 rounded-[4px] hover:bg-black/80">
                  <Download size={15} strokeWidth={1.8} />
                </a>}
              </div>}
            </div>
          </div>

          {notice && <p role="status" className="border-t border-line px-3 sm:px-4 py-2 bg-surface text-accent text-[10px] shrink-0">{notice}</p>}

          <div className="border-t border-line flex items-center gap-1 pl-3 sm:pl-4 py-2 bg-surface overflow-x-auto shrink-0">
            <button onClick={() => setActiveRenderId(null)} className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[10px] ${!activeRender ? 'bg-primary text-on-primary' : 'border border-line text-muted hover:border-line-hover'}`}>3D model</button>
            {renders.map((render) => (
              <button key={render.id} onClick={() => selectRender(render)} className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[10px] ${activeRenderId === render.id ? 'bg-primary text-on-primary' : 'border border-line text-muted hover:border-line-hover'}`}>{render.name}</button>
            ))}
            <button onClick={() => { setActiveRenderId(null); setActivePanel('inputs'); setInputPanelOpen(true); }} className="flex-shrink-0 border border-dashed border-line text-muted-2 text-[10px] px-2.5 sm:px-3 py-1.5 rounded-[4px] hover:border-line-hover-2">+ New render</button>
          </div>
        </section>
      </div>
    </div>
  );
}
